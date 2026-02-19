import * as ImageManipulator from "expo-image-manipulator";
import {log,warn,error,info} from "../utils/logger"

export async function compressImage(uri: string) {
  info("[Image:compressImage] start", { uri });

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  info("[Image:compressImage] success", {
    originalUri: uri,
    compressedUri: result.uri,
    width: result.width,
    height: result.height,
  });

  return result.uri;
}