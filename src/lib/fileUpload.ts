export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden"));
    reader.readAsDataURL(file);
  });
}

export function pickImageFile(onPick: (dataUrl: string, file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      throw new Error("Max. 12 MB");
    }
    const dataUrl = await readFileAsDataUrl(file);
    onPick(dataUrl, file);
  };
  input.click();
}