import { useState, useRef } from "react";
import { useSpots } from "@/hooks/use-spots";
import { Header } from "@/components/Header";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, Edit2, Save, X, Upload, Loader2, MapPin, Fish, Video, Compass
} from "lucide-react";
import type { FishingSpot } from "@shared/schema";
import { resolveImageUrl } from "@/lib/image-url";

// Interactive compass picker for sea direction
function SeaDirectionPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (direction: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;
    // Calculate angle (0 = north, 90 = east, etc.)
    let angle = Math.atan2(x, -y) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    onChange(Math.round(angle));
  };

  const directions = [
    { label: "N", angle: 0 },
    { label: "Ø", angle: 90 },
    { label: "S", angle: 180 },
    { label: "V", angle: 270 },
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative w-16 h-16 rounded-full border-2 border-blue-300 bg-gradient-to-b from-blue-100 to-blue-200 cursor-crosshair select-none"
        title="Klik for at markere havets retning"
      >
        {/* Direction labels */}
        {directions.map((d) => (
          <span
            key={d.label}
            className="absolute text-[10px] font-bold text-blue-600"
            style={{
              top: d.angle === 0 ? "2px" : d.angle === 180 ? "auto" : "50%",
              bottom: d.angle === 180 ? "2px" : "auto",
              left: d.angle === 270 ? "2px" : d.angle === 90 ? "auto" : "50%",
              right: d.angle === 90 ? "2px" : "auto",
              transform: d.angle === 0 || d.angle === 180 ? "translateX(-50%)" : "translateY(-50%)",
            }}
          >
            {d.label}
          </span>
        ))}
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full -translate-x-1/2 -translate-y-1/2" />
        {/* Sea direction indicator */}
        {value !== null && (
          <div
            className="absolute top-1/2 left-1/2 w-1 origin-bottom"
            style={{
              height: "24px",
              transform: `translate(-50%, -100%) rotate(${value}deg)`,
            }}
          >
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full -translate-x-[3px] shadow-md" />
          </div>
        )}
      </div>
      <span className="text-[10px] text-gray-500">
        {value !== null ? `${value}°` : "Ikke sat"}
      </span>
    </div>
  );
}

interface EditingSpot {
  id: number;
  name: string;
  description: string | null;
  bestFor: string | null;
  imageUrl: string | null;
  newImageFile: File | null;
  imagePreview: string | null;
  seaDirection: number | null;
}

export default function Admin() {
  const { data: spots, isLoading } = useSpots();
  const queryClient = useQueryClient();
  const [editingSpot, setEditingSpot] = useState<EditingSpot | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<FishingSpot>; imageFile?: File | null }) => {
      let imageUrl = data.updates.imageUrl;

      // Upload new image if provided
      if (data.imageFile) {
        const formData = new FormData();
        formData.append("image", data.imageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.imageUrl;
      }

      const res = await fetch(`/api/spots/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.updates, imageUrl }),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spots"] });
      setEditingSpot(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/spots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spots"] });
      setDeletingId(null);
    },
  });

  const startEditing = (spot: FishingSpot) => {
    setEditingSpot({
      id: spot.id,
      name: spot.name,
      description: spot.description,
      bestFor: spot.bestFor,
      imageUrl: spot.imageUrl,
      newImageFile: null,
      imagePreview: null,
      seaDirection: spot.seaDirection ?? null,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingSpot) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingSpot({
          ...editingSpot,
          newImageFile: file,
          imagePreview: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!editingSpot) return;
    updateMutation.mutate({
      id: editingSpot.id,
      updates: {
        name: editingSpot.name,
        description: editingSpot.description,
        bestFor: editingSpot.bestFor,
        imageUrl: editingSpot.imageUrl,
        seaDirection: editingSpot.seaDirection,
      },
      imageFile: editingSpot.newImageFile,
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Admin - Fiskesteder</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {spots?.map((spot) => (
              <div
                key={spot.id}
                className="bg-card rounded-xl border border-border p-4 shadow-sm"
              >
                {editingSpot?.id === spot.id ? (
                  // Edit mode
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-40 shrink-0">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        {editingSpot.imagePreview || editingSpot.imageUrl ? (
                          <div className="relative">
                            <img
                              src={editingSpot.imagePreview || resolveImageUrl(editingSpot.imageUrl) || ""}
                              alt="Preview"
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg"
                            >
                              <Upload className="w-6 h-6 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary"
                          >
                            <Upload className="w-6 h-6" />
                            <span className="text-xs mt-1">Upload</span>
                          </button>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={editingSpot.name}
                          onChange={(e) => setEditingSpot({ ...editingSpot, name: e.target.value })}
                          placeholder="Navn"
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                        />
                        <textarea
                          value={editingSpot.description ?? ""}
                          onChange={(e) => setEditingSpot({ ...editingSpot, description: e.target.value || null })}
                          placeholder="Beskrivelse (valgfri)"
                          rows={2}
                          className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none"
                        />
                      </div>

                      {/* Sea direction - only for fishing spots */}
                      {spot.spotType !== "webcam" && (
                        <div className="shrink-0">
                          <label className="block text-xs text-muted-foreground mb-1 text-center">Havretning</label>
                          <SeaDirectionPicker
                            value={editingSpot.seaDirection}
                            onChange={(dir) => setEditingSpot({ ...editingSpot, seaDirection: dir })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingSpot(null)}
                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4 inline mr-1" />
                        Annuller
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Gem
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className={`w-40 h-24 shrink-0 rounded-lg overflow-hidden ${spot.spotType === "webcam" ? "bg-purple-100" : "bg-muted"}`}>
                      {spot.imageUrl ? (
                        <img
                          src={resolveImageUrl(spot.imageUrl) || undefined}
                          alt={spot.name}
                          className="w-full h-full object-cover"
                        />
                      ) : spot.spotType === "webcam" && spot.webcamUrl && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(spot.webcamUrl) ? (
                        <img
                          src={`${spot.webcamUrl}${spot.webcamUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
                          alt={spot.name}
                          className="w-full h-full object-cover"
                        />
                      ) : spot.spotType === "webcam" ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-200 to-violet-100">
                          <Video className="w-8 h-8 text-purple-400" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Fish className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg">{spot.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {Number(spot.latitude).toFixed(4)}, {Number(spot.longitude).toFixed(4)}
                        </span>
                        {spot.spotType !== "webcam" && (
                          <span className="flex items-center gap-1">
                            <Compass className="w-3 h-3" />
                            {spot.seaDirection != null ? `${spot.seaDirection}°` : "Ikke sat"}
                          </span>
                        )}
                      </div>
                      {spot.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {spot.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => startEditing(spot)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      {deletingId === spot.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(spot.id)}
                            disabled={deleteMutation.isPending}
                            className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs font-medium"
                          >
                            {deleteMutation.isPending ? "..." : "Slet"}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2 py-1 text-xs text-muted-foreground"
                          >
                            Nej
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(spot.id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {spots?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Ingen fiskesteder endnu
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
