import { api } from "../api/client";
export async function login(usr: string, pwd: string) {
  console.log("=== LOGIN: Starting login ===", { usr });
  const params = new URLSearchParams();

  params.append("usr", usr);
  params.append("pwd", pwd);

  try {
    const { data } = await api.post(
      "/method/login",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log("=== LOGIN: Success ===", { data });

    return data;
  } catch (error: any) {
    console.error("=== LOGIN: Error ===", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

export async function logout() {
  console.log("=== LOGOUT: Starting logout ===");
  const { data } = await api.post("/method/logout");
  console.log("=== LOGOUT: Success ===", { data });
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/method/whoami");

  const userId = data.message;

  const res = await api.get(`/resource/User/${userId}`);

  return {
    id: res.data.data.name,
    email: res.data.data.email,
    name: res.data.data.full_name,
    avatarUrl: res.data.data.user_image,
    createdAt: Date.now(),
  };
}
export async function register(
  full_name: string,
  email: string,
  password: string
) {
  const { data } = await api.post(
    "/method/frappe.core.doctype.user.user.sign_up",
    {
      email,
      full_name,
      password,
      redirect_to: "/", // Required in Frappe v16
    }
  );

  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post(
    "/method/frappe.core.doctype.user.user.reset_password",
    { user: email }
  );

  return data;
}