import api from "./client";

// --- Auth ---
export const registerUser = (email, password, role) =>
  api.post("/auth/register", { email, password, role }).then((r) => r.data);

export const loginUser = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () => api.get("/auth/me").then((r) => r.data);

// --- Reference data ---
export const getCategories = () => api.get("/categories").then((r) => r.data);
export const getLocations = () => api.get("/locations").then((r) => r.data);

// --- Client portal ---
export const createClientRequirement = (payload) =>
  api.post("/clients", payload).then((r) => r.data);

export const getMyRequirements = () =>
  api.get("/clients/me").then((r) => r.data);

// --- Supplier portal ---
export const createSupplierOffering = (payload) =>
  api.post("/suppliers", payload).then((r) => r.data);

export const getMyOfferings = () =>
  api.get("/suppliers/me").then((r) => r.data);

// --- Matches ---
export const getMatchesForClient = (clientId) =>
  api.get(`/matches/client/${clientId}`).then((r) => r.data);

export const getMatchesForSupplier = (supplierId) =>
  api.get(`/matches/supplier/${supplierId}`).then((r) => r.data);

// --- Notifications ---
export const getMyNotifications = () =>
  api.get("/notifications/me").then((r) => r.data);

export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((r) => r.data);

// --- Dashboard ---
export const getDashboardOverview = () =>
  api.get("/dashboard/overview").then((r) => r.data);
