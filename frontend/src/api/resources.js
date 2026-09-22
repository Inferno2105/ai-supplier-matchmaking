import api from "./client";

// --- Auth ---
export const registerUser = (payload) =>
  api.post("/auth/register", payload).then((r) => r.data);

export const loginUser = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () => api.get("/auth/me").then((r) => r.data);

// --- Settings ---
export const getProfile = () => api.get("/settings/profile").then((r) => r.data);

export const updateProfile = (payload) =>
  api.patch("/settings/profile", payload).then((r) => r.data);

export const updatePassword = (payload) =>
  api.patch("/settings/password", payload).then((r) => r.data);

// --- Reference data ---
export const getCategories = () => api.get("/categories").then((r) => r.data);
export const getLocations = () => api.get("/locations").then((r) => r.data);

// --- Client portal ---
export const createClientRequirement = (payload) =>
  api.post("/clients", payload).then((r) => r.data);

export const getMyRequirements = () =>
  api.get("/clients/me").then((r) => r.data);

export const getClientById = (id) => api.get(`/clients/${id}`).then((r) => r.data);

export const updateClientRequirement = (id, payload) =>
  api.patch(`/clients/${id}`, payload).then((r) => r.data);

export const withdrawClientRequirement = (id) =>
  api.patch(`/clients/${id}/withdraw`).then((r) => r.data);

export const reactivateClientRequirement = (id) =>
  api.patch(`/clients/${id}/reactivate`).then((r) => r.data);

// --- Supplier portal ---
export const createSupplierOffering = (payload) =>
  api.post("/suppliers", payload).then((r) => r.data);

export const getMyOfferings = () =>
  api.get("/suppliers/me").then((r) => r.data);

export const getSupplierById = (id) => api.get(`/suppliers/${id}`).then((r) => r.data);

export const updateSupplierOffering = (id, payload) =>
  api.patch(`/suppliers/${id}`, payload).then((r) => r.data);

export const withdrawSupplierOffering = (id) =>
  api.patch(`/suppliers/${id}/withdraw`).then((r) => r.data);

export const reactivateSupplierOffering = (id) =>
  api.patch(`/suppliers/${id}/reactivate`).then((r) => r.data);

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

// --- Marketplace ---
export const getMarketplaceSuppliers = (filters = {}) =>
  api.get("/marketplace/suppliers", { params: filters }).then((r) => r.data);

export const getMarketplaceClients = (filters = {}) =>
  api.get("/marketplace/clients", { params: filters }).then((r) => r.data);

// --- Interests ---
export const expressInterest = (clientId, supplierId) =>
  api.post("/interests", { client_id: clientId, supplier_id: supplierId }).then((r) => r.data);

export const getMyInterests = (filters = {}) =>
  api.get("/interests/me", { params: filters }).then((r) => r.data);

export const getInterestsWithChats = () => getMyInterests({ has_chat: true });

export const acceptInterest = (id) =>
  api.patch(`/interests/${id}/accept`).then((r) => r.data);

export const declineInterest = (id) =>
  api.patch(`/interests/${id}/decline`).then((r) => r.data);

// --- Activity ---
export const getActivity = () => api.get("/activity/me").then((r) => r.data);

// --- Messages ---
export const getMessages = (interestId) =>
  api.get(`/interests/${interestId}/messages`).then((r) => r.data);

export const sendMessage = (interestId, text) =>
  api.post(`/interests/${interestId}/messages`, { text }).then((r) => r.data);
