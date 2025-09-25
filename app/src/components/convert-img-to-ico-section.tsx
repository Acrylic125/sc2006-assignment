"use client";

import { useCallback, useState } from "react";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "./ui/shadcn-io/dropzone";
import { Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import JSZip from "jszip";
import { useMutation } from "@tanstack/react-query";

const createIcoFile = async (pngBlob: Blob, size: number): Promise<Blob> => {
  // ICO file format structure
  const icoHeader = new ArrayBuffer(6);
  const headerView = new DataView(icoHeader);

  // ICO file signature
  headerView.setUint16(0, 0, true); // Reserved, must be 0
  headerView.setUint16(2, 1, true); // Type, 1 for ICO
  headerView.setUint16(4, 1, true); // Number of images

  // Image directory entry (16 bytes)
  const dirEntry = new ArrayBuffer(16);
  const dirView = new DataView(dirEntry);

  dirView.setUint8(0, size === 256 ? 0 : size); // Width
  dirView.setUint8(1, size === 256 ? 0 : size); // Height
  dirView.setUint8(2, 0); // Color palette
  dirView.setUint8(3, 0); // Reserved
  dirView.setUint16(4, 1, true); // Color planes
  dirView.setUint16(6, 32, true); // Bits per pixel
  dirView.setUint32(8, 0, true); // Image data size (will be updated)
  dirView.setUint32(12, 22, true); // Offset to image data

  return new Promise<Blob>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const pngData = new Uint8Array(reader.result as ArrayBuffer);

      // Update the size in directory entry
      const updatedDirEntry = new ArrayBuffer(16);
      const updatedDirView = new DataView(updatedDirEntry);
      for (let i = 0; i < 16; i++) {
        updatedDirView.setUint8(i, dirView.getUint8(i));
      }
      updatedDirView.setUint32(8, pngData.length, true);

      // Combine all parts
      const totalSize =
        icoHeader.byteLength + updatedDirEntry.byteLength + pngData.length;
      const icoData = new Uint8Array(totalSize);

      let offset = 0;
      icoData.set(new Uint8Array(icoHeader), offset);
      offset += icoHeader.byteLength;
      icoData.set(new Uint8Array(updatedDirEntry), offset);
      offset += updatedDirEntry.byteLength;
      icoData.set(pngData, offset);

      resolve(new Blob([icoData], { type: "image/x-icon" }));
    };
    reader.readAsArrayBuffer(pngBlob);
  });
};

const convertImageToIco = async (file: File, size: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;

      // Draw the image scaled to fit the canvas
      ctx.drawImage(img, 0, 0, size, size);

      // Convert canvas to PNG data URL
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to convert canvas to blob"));
          return;
        }

        // Create ICO file structure
        createIcoFile(blob, size).then(resolve).catch(reject);
      }, "image/png");
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
};

const downloadZip = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename.split(".")[0]}-icons.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export function ConvertImgToIcoSection() {
  const [files, setFiles] = useState<File[]>([]);
  const [dropdownError, setDropdownError] = useState<string | null>(null);

  const downloadMutation = useMutation({
    mutationKey: ["convert-to-ico"],
    mutationFn: async (file: File) => {
      const sizes = [16, 32, 48, 64, 72, 96, 128, 256, 512];
      const zip = new JSZip();

      try {
        // Generate ICO files for each size
        const icoPromises = sizes.map(async (size) => {
          const icoBlob = await convertImageToIco(file, size);
          const filename = `${size}x${size}.ico`;
          zip.file(filename, icoBlob);
          return { size, filename };
        });
        // Add favicon.ico to the zip
        icoPromises.push(
          convertImageToIco(file, 32).then((icoBlob) => {
            zip.file("favicon.ico", icoBlob);
            return { size: 32, filename: "favicon.ico" };
          })
        );

        await Promise.all(icoPromises);

        // Generate the ZIP file
        const zipBlob = await zip.generateAsync({ type: "blob" });
        return zipBlob;
      } catch (error) {
        console.error("Error in mutation:", error);
        throw error;
      }
    },
    onSuccess: (zipBlob, file) => {
      console.log("Mutation successful, downloading...");
      downloadZip(zipBlob, file.name);
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
    },
  });

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles(acceptedFiles);
      setDropdownError(null);
      downloadMutation.reset();
    },
    [downloadMutation]
  );

  const handleConvertAndDownload = useCallback(() => {
    if (files.length === 0) {
      return;
    }

    downloadMutation.mutate(files[0]);
  }, [files, downloadMutation]);

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <Dropzone
        // Only accept images
        accept={{
          "image/*": [".png", ".jpg", ".jpeg", ".tiff", ".svg", ".ico"],
        }}
        maxSize={1024 * 1024 * 10}
        minSize={16}
        onDrop={handleDrop}
        onError={(err) => setDropdownError(err.message)}
        src={files}
      >
        <DropzoneEmptyState />
        <DropzoneContent />
        {dropdownError && (
          <Alert variant="error" className="w-full max-w-md mt-4">
            <AlertTitle className="text-center font-bold">
              Invalid file!
            </AlertTitle>
            <AlertDescription className="w-full text-center justify-center font-medium">
              {dropdownError}
            </AlertDescription>
          </Alert>
        )}
      </Dropzone>

      <Button
        className="w-fit"
        onClick={handleConvertAndDownload}
        disabled={downloadMutation.isPending || files.length === 0}
      >
        {downloadMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Convert to ICO
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Convert to ICO
          </>
        )}
      </Button>

      {downloadMutation.error && (
        <Alert variant="error" className="w-full max-w-md">
          <AlertTitle className="text-center font-bold">
            Conversion Error
          </AlertTitle>
          <AlertDescription className="w-full text-center justify-center font-medium">
            {downloadMutation.error instanceof Error
              ? downloadMutation.error.message
              : "Conversion failed"}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
