import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  photo?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photo?: string | null;
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  photo?: string;
}

const handleAuthRequest = async (
  endpoint: string,
  payload: Record<string, unknown>,
  loadingMessage: string,
  successMessage: string
): Promise<AuthResponse | null> => {
  const loadingToastId = showLoading(loadingMessage);
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Falha na autenticação");
    }

    const data: AuthResponse = await response.json();
    dismissToast(loadingToastId);
    showSuccess(successMessage);
    return data;
  } catch (error) {
    dismissToast(loadingToastId);
    showError("Erro ao processar a requisição. Verifique os dados e tente novamente.");
    console.error(`[Auth] ${endpoint} error:`, error);
    return null;
  }
};

export const login = async (email: string, password: string): Promise<AuthResponse | null> => {
  return handleAuthRequest(
    "signin",
    { email, password },
    "Fazendo login...",
    "Login realizado com sucesso!"
  );
};

export const register = async (payload: RegisterRequest): Promise<AuthResponse | null> => {
  return handleAuthRequest("signup", payload, "Criando conta...", "Conta criada com sucesso!");
};

export const getProfile = async (accessToken: string): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data: User = await response.json();
      return data;
    } else {
      throw new Error("Falha ao carregar perfil");
    }
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    return null;
  }
};

export const updateProfile = async (
  accessToken: string,
  profileData: ProfileUpdateRequest
): Promise<User | null> => {
  const loadingToastId = showLoading("Atualizando perfil...");
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });

    if (response.ok) {
      const data: User = await response.json();
      dismissToast(loadingToastId);
      showSuccess("Perfil atualizado com sucesso!");
      return data;
    } else {
      throw new Error("Falha ao atualizar perfil");
    }
  } catch (error) {
    dismissToast(loadingToastId);
    showError("Erro ao atualizar perfil.");
    console.error("Erro ao atualizar perfil:", error);
    return null;
  }
};
