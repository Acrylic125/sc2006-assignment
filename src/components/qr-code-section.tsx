"use client";

import QRCode from "react-qr-code";
import { Input } from "./ui/input";
import { useCallback, useRef, useState } from "react";
import { Button } from "./ui/button";

export function QRCodeGenerator() {
  const [url, setUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const downloadAsSVG = useCallback(() => {
    if (!qrCodeRef.current || !generatedUrl) return;

    const svg = qrCodeRef.current.querySelector("svg");
    if (!svg) return;

    // Clone the SVG to avoid modifying the original
    const svgClone = svg.cloneNode(true) as SVGSVGElement;

    // Ensure proper dimensions for high quality
    svgClone.setAttribute("width", "512");
    svgClone.setAttribute("height", "512");
    svgClone.setAttribute("viewBox", "0 0 256 256");

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const a = document.createElement("a");
    a.href = svgUrl;
    a.download = "qrcode.svg";
    a.click();

    URL.revokeObjectURL(svgUrl);
  }, [generatedUrl]);

  const downloadAsPNG = useCallback(() => {
    if (!qrCodeRef.current || !generatedUrl) return;

    const svg = qrCodeRef.current.querySelector("svg");
    if (!svg) return;

    // Set higher resolution for better quality
    const scale = 4; // 4x resolution for crisp output
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Enable high-quality image rendering
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Set canvas size with scaling
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Scale the context to match the scaling factor
      ctx?.scale(scale, scale);
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "qrcode.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      }, "image/png");
      URL.revokeObjectURL(svgUrl);
    };

    img.src = svgUrl;
  }, [generatedUrl]);

  const downloadAsJPG = useCallback(() => {
    if (!qrCodeRef.current || !generatedUrl) return;

    const svg = qrCodeRef.current.querySelector("svg");
    if (!svg) return;

    // Set higher resolution for better quality
    const scale = 4; // 4x resolution for crisp output
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Enable high-quality image rendering
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Set canvas size with scaling
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Scale the context to match the scaling factor
      ctx?.scale(scale, scale);

      // Fill with white background for JPG
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, img.width, img.height);
      }

      ctx?.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "qrcode.jpg";
            a.click();
            URL.revokeObjectURL(url);
          }
        },
        "image/jpeg",
        1
      );
      URL.revokeObjectURL(svgUrl);
    };

    img.src = svgUrl;
  }, [generatedUrl]);

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <div className="w-full flex flex-row items-center bg-input/30 rounded-md border-border border-2">
        <Input
          className="w-full h-12 flex-1 bg-transparent dark:bg-transparent border-none"
          placeholder="Enter URL / Text / Data"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="w-fit h-12 flex items-center px-2 border-l-border border-l-2">
          <Button size="sm" onClick={() => setGeneratedUrl(url)}>
            Generate
          </Button>
        </div>
      </div>
      <div className="w-full flex flex-col md:flex-row items-center md:items-start gap-4 lg:gap-8 border-border border-4 border-dashed rounded-md p-2 pb-12 lg:p-4">
        {generatedUrl ? (
          <div ref={qrCodeRef}>
            <QRCode
              value={generatedUrl}
              className="w-64 border-white border-4"
            />
          </div>
        ) : (
          <div className="w-64 bg-card rounded-md border-border border-2 aspect-square flex items-center justify-center p-4">
            <p className="text-foreground text-center">
              No QR code generated yet
            </p>
          </div>
        )}
        <div className="h-64 flex-1 flex flex-col gap-4 justify-center">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Download your QR code
            </h3>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              variant="secondary"
              className="w-fit"
              onClick={downloadAsPNG}
              disabled={!generatedUrl}
            >
              PNG
            </Button>
            <Button
              variant="secondary"
              className="w-fit"
              onClick={downloadAsJPG}
              disabled={!generatedUrl}
            >
              JPG
            </Button>
            <Button
              variant="secondary"
              className="w-fit"
              onClick={downloadAsSVG}
              disabled={!generatedUrl}
            >
              SVG
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
