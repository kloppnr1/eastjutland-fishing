import { useState, useEffect, useCallback, useRef } from "react";
import { X, MapPin, Plus, Thermometer, Loader2, Upload, Wind } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isStaticMode, useSpots } from "@/hooks/use-spots";

interface AddSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: { lat: number; lng: number } | null;
}

export function AddSpotModal({ isOpen, onClose, coordinates }: AddSpotModalProps) {
  const queryClient = useQueryClient();
  const spotsData = useSpots();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    bestFor: "",
  });
  const [error, setError] = useState("");
  const [waterTemp, setWaterTemp] = useState<number | null>(null);
  const [airTemp, setAirTemp] = useState<number | null>(null);
  const [windSpeed, setWindSpeed] = useState<number | null>(null);
  const [windDirection, setWindDirection] = useState<number | null>(null);
  const [measurementTime, setMeasurementTime] = useState<string | null>(null);
  const [tempLoading, setTempLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);

  // Reverse geocoding to get place name
  const fetchPlaceName = useCallback(async () => {
    if (!coordinates) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'da' } }
      );
      if (res.ok) {
        const data = await res.json();
        // Try to get a meaningful name from the response
        const address = data.address || {};
        const name = address.beach || address.water || address.bay ||
                     address.peninsula || address.locality || address.hamlet ||
                     address.village || address.suburb || address.town ||
                     address.municipality || data.name;
        if (name) {
          setSuggestedName(name);
          // Only pre-fill if name field is empty
          setFormData(prev => prev.name === "" ? { ...prev, name } : prev);
        }
      }
    } catch (err) {
      console.error("Failed to fetch place name:", err);
    }
  }, [coordinates?.lat, coordinates?.lng]);

  const fetchWeather = useCallback(async () => {
    if (!coordinates) return;

    setTempLoading(true);
    try {
      const [marineRes, weatherRes] = await Promise.all([
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${coordinates.lat}&longitude=${coordinates.lng}&current=sea_surface_temperature`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Europe/Copenhagen`),
      ]);

      if (marineRes.ok) {
        const marineData = await marineRes.json();
        const temp = marineData.current?.sea_surface_temperature;
        const time = marineData.current?.time;
        if (typeof temp === "number") {
          setWaterTemp(temp);
        }
        if (time) {
          setMeasurementTime(time);
        }
      }

      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        const temp = weatherData.current?.temperature_2m;
        const wind = weatherData.current?.wind_speed_10m;
        const dir = weatherData.current?.wind_direction_10m;
        if (typeof temp === "number") {
          setAirTemp(temp);
        }
        if (typeof wind === "number") {
          setWindSpeed(wind);
        }
        if (typeof dir === "number") {
          setWindDirection(dir);
        }
        if (!measurementTime && weatherData.current?.time) {
          setMeasurementTime(weatherData.current.time);
        }
      }
    } catch (err) {
      console.error("Failed to fetch weather:", err);
    } finally {
      setTempLoading(false);
    }
  }, [coordinates?.lat, coordinates?.lng]);

  // Fetch weather and place name when coordinates change
  useEffect(() => {
    if (!coordinates || !isOpen) {
      setWaterTemp(null);
      setAirTemp(null);
      setWindSpeed(null);
      setWindDirection(null);
      setMeasurementTime(null);
      setSuggestedName(null);
      return;
    }

    fetchWeather();
    fetchPlaceName();

    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [coordinates?.lat, coordinates?.lng, isOpen, fetchWeather, fetchPlaceName]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append("image", imageFile);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Kunne ikke uploade billede");
    }
    return data.imageUrl;
  };

  // Server mode mutation
  const createSpotMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      latitude: string;
      longitude: string;
      description: string;
      bestFor: string;
      imageUrl?: string | null;
    }) => {
      const res = await fetch("/api/spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Kunne ikke oprette sted");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spots"] });
      onClose();
      resetForm();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", bestFor: "" });
    setImageFile(null);
    setImagePreview(null);
    setError("");
    setSuggestedName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coordinates) return;
    if (!formData.name) {
      setError("Udfyld venligst navn");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isStaticMode) {
        // Static mode: use localStorage
        const addSpot = (spotsData as any).addSpot;
        if (addSpot) {
          addSpot({
            name: formData.name,
            latitude: coordinates.lat.toFixed(6),
            longitude: coordinates.lng.toFixed(6),
            description: formData.description,
            bestFor: formData.bestFor,
            imageUrl: null,
          });
          onClose();
          resetForm();
        }
      } else {
        // Server mode: upload image and create via API
        setUploading(true);
        const imageUrl = await uploadImage();

        createSpotMutation.mutate({
          name: formData.name,
          latitude: coordinates.lat.toFixed(6),
          longitude: coordinates.lng.toFixed(6),
          description: formData.description,
          bestFor: formData.bestFor,
          imageUrl,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette sted");
    } finally {
      setUploading(false);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const submitting = isSubmitting || uploading || createSpotMutation.isPending;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-2">Tilføj nyt fiskested</h2>

        {coordinates && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4" />
              <span className="font-mono">
                {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <Thermometer className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                {tempLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <div className="text-lg font-bold text-blue-600">
                    {waterTemp !== null ? `${waterTemp.toFixed(1)}°` : "--"}
                  </div>
                )}
                <div className="text-xs text-gray-500">Vand</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-2">
                <Thermometer className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                {tempLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <div className="text-lg font-bold text-orange-600">
                    {airTemp !== null ? `${airTemp.toFixed(1)}°` : "--"}
                  </div>
                )}
                <div className="text-xs text-gray-500">Luft</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <Wind className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                {tempLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <div className="text-lg font-bold text-gray-700">
                    {windSpeed !== null ? `${windSpeed.toFixed(0)} m/s` : "--"}
                  </div>
                )}
                <div className="text-xs text-gray-500">Vind</div>
              </div>
            </div>

          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload - only in server mode */}
          {!isStaticMode && (
            <div>
              <label className="block text-sm font-medium mb-1">Billede</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload className="w-8 h-8" />
                  <span className="text-sm">Klik for at uploade billede</span>
                  <span className="text-xs">(JPG, PNG, WebP - max 5MB)</span>
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Navn</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="f.eks. Kalø Strand"
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Beskrivelse <span className="text-muted-foreground font-normal">(valgfri)</span></label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Beskriv stedet, bundforhold, dybde..."
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {submitting ? "Opretter..." : "Tilføj sted"}
          </button>
        </form>
      </div>
    </div>
  );
}
