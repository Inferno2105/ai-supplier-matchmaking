import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getLocations, createSupplierOffering } from "../api/resources";
import { TextField, TextAreaField, SelectField } from "../components/FormFields";

const EMPTY = {
  supplier_name: "",
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
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState({});
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
    getLocations().then(setLocations);
  }, []);

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
      await createSupplierOffering({
        ...form,
        available_quantity: Number(form.available_quantity),
        price_min: Number(form.price_min),
        price_max: Number(form.price_max),
        delivery_days_capable: Number(form.delivery_days_capable),
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail ?? "Something went wrong submitting your offering.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Submit an offering</h1>
      <p className="mt-1 text-sm text-slate-500">
        We'll automatically match this against client requirements in the same category.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextField
          label="Supplier name"
          required
          value={form.supplier_name}
          onChange={update("supplier_name")}
        />
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

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Submitting & finding matches…" : "Submit offering"}
        </button>
      </form>
    </div>
  );
}
