import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getProfile, updateProfile, updatePassword } from "../api/resources";
import { TextField } from "../components/FormFields";
import { getInitialTheme, applyTheme } from "../theme";

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type="text"
        value={value}
        disabled
        className="mt-1 w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const isClient = user?.role === "client";

  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [identityName, setIdentityName] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    getProfile().then((data) => {
      setProfile(data);
      setFullName(data.full_name);
      setPhoneNumber(data.phone_number);
      setIdentityName(isClient ? data.company_name ?? "" : data.supplier_name ?? "");
      setProfileLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileSaving(true);
    try {
      const payload = {
        full_name: fullName,
        phone_number: phoneNumber,
        ...(isClient ? { company_name: identityName } : { supplier_name: identityName }),
      };
      const updated = await updateProfile(payload);
      setProfile(updated);
      await refreshUser();
      setProfileSuccess("Profile updated.");
    } catch (err) {
      setProfileError(err.response?.data?.detail ?? "Could not update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated.");
    } catch (err) {
      setPasswordError(err.response?.data?.detail ?? "Could not update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Manage your profile, password, and appearance.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Profile
        </h2>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          {profileLoading ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="Email" value={profile.email} />
                <ReadOnlyField label="Role" value={profile.role} />
              </div>
              <TextField
                label="Full name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <TextField
                label="Phone number"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <TextField
                label={isClient ? "Company name" : "Supplier / business name"}
                required
                value={identityName}
                onChange={(e) => setIdentityName(e.target.value)}
              />

              {profileError && <p className="text-sm text-rose-600 dark:text-rose-400">{profileError}</p>}
              {profileSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{profileSuccess}</p>}

              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {profileSaving ? "Saving…" : "Save profile"}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Password
        </h2>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <TextField
              label="Current password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <TextField
              label="New password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <TextField
              label="Confirm new password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {passwordError && <p className="text-sm text-rose-600 dark:text-rose-400">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{passwordSuccess}</p>}

            <button
              type="submit"
              disabled={passwordSaving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {passwordSaving ? "Saving…" : "Change password"}
            </button>
          </form>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Appearance
        </h2>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Theme</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {theme === "dark" ? "Dark mode is on." : "Light mode is on."}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Switch to light" : "Switch to dark"}
          </button>
        </div>
      </section>
    </div>
  );
}
