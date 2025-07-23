import qrcode from "qrcode";
import { getFormattedErrorMessage } from "./error.js";

export const generateQrCodeAsBase64 = async (url: string): Promise<string> => {
  try {
    const qrCodeDataUrl = await qrcode.toDataURL(url, {
      type: "image/webp",
      errorCorrectionLevel: "H",
      margin: 1,
      scale: 8,
    });

    return qrCodeDataUrl;
  } catch (error) {
    throw new Error(getFormattedErrorMessage(error, "Failed to generate QR code as Base64."));
  }
};
