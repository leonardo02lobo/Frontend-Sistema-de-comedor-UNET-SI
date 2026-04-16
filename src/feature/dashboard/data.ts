async function uploadImageMeal(imageInput: HTMLInputElement): Promise<string | undefined> {
  const file = imageInput.files?.[0];
  if (!file) {
    return undefined;
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:3001/api/upload", {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const payload = await response.json();

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || payload?.message || "No se pudo subir la imagen");
  }

  return payload.data.url;
}