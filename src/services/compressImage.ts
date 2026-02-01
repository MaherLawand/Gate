import * as ImageManipulator from "expo-image-manipulator";

export async function compressImage(uri: string) {
  console.info("[Image:compressImage] start", { uri });

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  console.info("[Image:compressImage] success", {
    originalUri: uri,
    compressedUri: result.uri,
    width: result.width,
    height: result.height,
  });

  return result.uri;
}