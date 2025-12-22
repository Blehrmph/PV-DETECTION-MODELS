import React, { useCallback, useState } from "react";
import { Upload, Image, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  isProcessing: boolean;
  selectedImage: File | null;
  onClear: () => void;
}

export function ImageUploader({
  onImageSelect,
  isProcessing,
  selectedImage,
  onClear,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setPreviewUrl(URL.createObjectURL(file));
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const handleClear = useCallback(() => {
    setPreviewUrl(null);
    onClear();
  }, [onClear]);

  return (
    <div className="w-full">
      {!selectedImage ? (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300",
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-card/50"
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          
          <div className={cn(
            "flex flex-col items-center gap-4 transition-transform duration-300",
            isDragging && "scale-110"
          )}>
            <div className="relative">
              <div className="absolute inset-0 gradient-solar opacity-20 blur-2xl rounded-full" />
              <div className="relative p-4 rounded-2xl bg-secondary/50 border border-border">
                <Upload className="w-8 h-8 text-primary" />
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">
                Drop your PV panel image here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse files
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Image className="w-4 h-4" />
              <span>Supports JPG, PNG, WebP</span>
            </div>
          </div>

          {/* Decorative corners */}
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-primary/30 rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-primary/30 rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-primary/30 rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-primary/30 rounded-br-lg" />
        </label>
      ) : (
        <div className="relative w-full h-64 rounded-xl overflow-hidden glass-card">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Selected PV panel"
              className="w-full h-full object-contain bg-black/20"
            />
          )}
          
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-foreground font-medium">
                  Analyzing image...
                </span>
              </div>
              {/* Scanning line effect */}
              <div className="absolute left-0 right-0 h-1 gradient-solar opacity-50 animate-scan" />
            </div>
          )}
          
          {!isProcessing && (
            <Button
              variant="glass"
              size="icon"
              onClick={handleClear}
              className="absolute top-3 right-3"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
            <p className="text-sm font-medium truncate">{selectedImage.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedImage.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
