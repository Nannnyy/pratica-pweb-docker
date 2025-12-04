import { showError, showLoading, showSuccess, dismissToast } from "@/utils/toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const uploadProfilePhoto = async (accessToken: string, file: File): Promise<string | null> => {
  const loadingToastId = showLoading("Enviando foto...");
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/profile/photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    if (!response.ok) throw new Error("Falha ao enviar foto");
    const data = await response.json();
    dismissToast(loadingToastId);
    showSuccess("Foto enviada com sucesso!");
    return data.url;
  } catch (error) {
    dismissToast(loadingToastId);
    showError("Erro ao enviar foto de perfil.");
    return null;
  }
};
