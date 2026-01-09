import { useState, useRef } from "react";
import { useSpots } from "@/hooks/use-spots";
import { Header } from "@/components/Header";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, Edit2, Save, X, Upload, Loader2, MapPin, Fish
} from "lucide-react";
import type { FishingSpot } from "@shared/schema";
import { resolveImageUrl } from "@/lib/image-url";

interface EditingSpot {
  id: number;
  name: string;
  description: string | null;
  bestFor: string | null;
  imageUrl: string | null;
  newImageFile: File | null;
  imagePreview: string | null;
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
                    <div className="w-40 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
                      {spot.imageUrl ? (
                        <img
                          src={resolveImageUrl(spot.imageUrl) || undefined}
                          alt={spot.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Fish className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg">{spot.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3" />
                        <span>{Number(spot.latitude).toFixed(4)}, {Number(spot.longitude).toFixed(4)}</span>
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
