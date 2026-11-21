export interface CompressedImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

const MAX_DIMENSION = 1280;

export async function compressImageFile(file: File): Promise<CompressedImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return renderCompressedCanvas(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function imageUrlToCompressedBase64(url: string): Promise<CompressedImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Could not load sample image.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    return renderCompressedCanvas(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function captureVideoFrame(video: HTMLVideoElement): CompressedImage {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize camera canvas.');
  }
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  const base64 = dataUrl.split(',')[1] || '';
  return {
    base64,
    mimeType: 'image/jpeg',
    previewUrl: dataUrl,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image file.'));
    img.src = src;
  });
}

function renderCompressedCanvas(img: HTMLImageElement): CompressedImage {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not process image.');
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64 = dataUrl.split(',')[1] || '';
  return {
    base64,
    mimeType: 'image/jpeg',
    previewUrl: dataUrl,
  };
}
