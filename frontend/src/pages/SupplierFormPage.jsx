import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getCategories,
  getLocations,
  createSupplierOffering,
  getSupplierById,
  updateSupplierOffering,
} from "../api/resources";
import { useAuth } from "../context/AuthContext";
import { TextField, TextAreaField, SelectField } from "../components/FormFields";
import { getRoleAccent } from "../roleTheme";

const EMPTY = {
  product_offered: "",
  category: "",
  available_quantity: "",
  price_min: "",
  price_max: "",
  state: "",
  city: "",
  delivery_days_capable: "",
  notes: "",
};

export default function SupplierFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const accent = getRoleAccent(user?.role);
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState({});
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    getCategories().then(setCategories);
    getLocations().then(setLocations);
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getSupplierById(id).then((data) => {
      setForm({
        product_offered: data.product_offered,
        category: data.category,
        available_quantity: String(data.available_quantity),
        price_min: String(data.price_min),
        price_max: String(data.price_max),
        state: data.state,
        city: data.city,
        delivery_days_capable: String(data.delivery_days_capable),
        notes: data.notes ?? "",
      });
      setLoading(false);
    });
  }, [id, isEdit]);

  const cities = form.state ? locations[form.state] ?? [] : [];

  const update = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      [field]: value,
      ...(field === "state" ? { city: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        available_quantity: Number(form.available_quantity),
        price_min: Number(form.price_min),
        price_max: Number(form.price_max),
        delivery_days_capable: Number(form.delivery_days_capable),
      };
      if (isEdit) {
        await updateSupplierOffering(id, payload);
      } else {
        await createSupplierOffering(payload);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail ?? "Something went wrong submitting your offering.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {isEdit ? "Edit offering" : "Submit an offering"}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isEdit
          ? "Saving re-runs matching against same-category client requirements and updates your existing match scores."
          : "We'll automatically match this against client requirements in the same category."}
      </p>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Submitting as <span className="font-medium text-slate-700 dark:text-slate-300">{user?.supplier_name}</span>.
        Change your supplier name on the{" "}
        <Link to="/settings" className={accent.link}>
          Settings page
        </Link>
        .
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextAreaField
          label="Product offered"
          required
          placeholder="Describe what you supply — this is used for semantic matching"
          value={form.product_offered}
          onChange={update("product_offered")}
        />
        <SelectField label="Category" required value={form.category} onChange={update("category")}>
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Available quantity"
          type="number"
          min="1"
          required
          value={form.available_quantity}
          onChange={update("available_quantity")}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Price min (₹)"
            type="number"
            min="0"
            required
            value={form.price_min}
            onChange={update("price_min")}
          />
          <TextField
            label="Price max (₹)"
            type="number"
            min="0"
            required
            value={form.price_max}
            onChange={update("price_max")}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="State" required value={form.state} onChange={update("state")}>
            <option value="" disabled>
              Select a state
            </option>
            {Object.keys(locations).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="City"
            required
            value={form.city}
            onChange={update("city")}
            disabled={!form.state}
          >
            <option value="" disabled>
              {form.state ? "Select a city" : "Select a state first"}
            </option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
        </div>

        <TextField
          label="Delivery capable within (days)"
          type="number"
          min="1"
          required
          value={form.delivery_days_capable}
          onChange={update("delivery_days_capable")}
        />

        <TextAreaField
          label="Additional notes"
          placeholder="Optional — certifications, bulk discounts, negotiation notes, etc."
          value={form.notes}
          onChange={update("notes")}
        />

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60 ${accent.button}`}
        >
          {submitting
            ? isEdit
              ? "Saving & re-matching…"
              : "Submitting & finding matches…"
            : isEdit
              ? "Save changes"
              : "Submit offering"}
        </button>
      </form>
    </div>
  );
}
