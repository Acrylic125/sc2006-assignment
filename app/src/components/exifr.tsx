import {
    gps,
} from "exifr";

export async function CoordsFromImage(file: File): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const coords = await gps(file);

    if (coords?.latitude && coords?.longitude) {
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    }

    return null;
  } catch (err) {
    console.error('Error extracting EXIF GPS:', err);
    return null;
  }
}