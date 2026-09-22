import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCategories, getLocations, createClientRequirement } from "../api/resources";
import { TextField, TextAreaField, SelectField } from "../components/FormFields";

const EMPTY = {
  company_name: "",
  product_requirement: "",
  category: "",
  quantity_required: "",
  budget_min: "",
  budget_max: "",
  state: "",
  city: "",
  delivery_days_needed: "",
  notes: "",
};

export default function ClientFormPage() {
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
      await createClientRequirement({
        ...form,
        quantity_required: Number(form.quantity_required),
        budget_min: Number(form.budget_min),
        budget_max: Number(form.budget_max),
        delivery_days_needed: Number(form.delivery_days_needed),
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail ?? "Something went wrong submitting your requirement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900">Submit a requirement</h1>
      <p className="mt-1 text-sm text-slate-500">
        We'll automatically match this against suppliers in the same category.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextField
          label="Company / client name"
          required
          value={form.company_name}
          onChange={update("company_name")}
        />
        <TextAreaField
          label="Product requirement"
          required
          placeholder="Describe what you need — this is used for semantic matching"
          value={form.product_requirement}
          onChange={update("product_requirement")}
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
          label="Quantity required"
          type="number"
          min="1"
          required
          value={form.quantity_required}
          onChange={update("quantity_required")}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Budget min (₹)"
            type="number"
            min="0"
            required
            value={form.budget_min}
            onChange={update("budget_min")}
          />
          <TextField
            label="Budget max (₹)"
            type="number"
            min="0"
            required
            value={form.budget_max}
            onChange={update("budget_max")}
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
          label="Delivery needed within (days)"
          type="number"
          min="1"
          required
          value={form.delivery_days_needed}
          onChange={update("delivery_days_needed")}
        />

        <TextAreaField
          label="Additional notes"
          placeholder="Optional — certifications, preferences, negotiation notes, etc."
          value={form.notes}
          onChange={update("notes")}
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Submitting & finding matches…" : "Submit requirement"}
        </button>
      </form>
    </div>
  );
}
