import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StarRating from "./StarRating";
import { toast } from "sonner";

interface ReflectionFormProps {
  alignmentId: string;
  onReflectionAdded: () => void;
  canAddReflection: boolean;
  nextReflectionTime?: Date;
}

export default function ReflectionForm({ 
  alignmentId, 
  onReflectionAdded, 
  canAddReflection,
  nextReflectionTime 
}: ReflectionFormProps) {
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add a reflection");
        return;
      }

      const { error } = await supabase
        .from('alignment_reflections')
        .insert({
          alignment_id: alignmentId,
          user_id: user.id,
          star_rating: rating,
          notes: notes.trim() || null,
        });

      if (error) throw error;

      toast.success("Reflection saved successfully");
      setRating(0);
      setNotes("");
      onReflectionAdded();
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast.error("Failed to save reflection");
    } finally {
      setSaving(false);
    }
  };

  if (!canAddReflection && nextReflectionTime) {
    const timeLeft = Math.ceil((nextReflectionTime.getTime() - Date.now()) / 60000);
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            You can add another reflection in {timeLeft} minute{timeLeft !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add Reflection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            How well did you align with your daily goal?
          </label>
          <StarRating rating={rating} onRatingChange={setRating} />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Notes (optional)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share your thoughts about this alignment..."
            className="min-h-[100px]"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving || rating === 0}
          className="w-full"
        >
          {saving ? "Saving..." : "Save Reflection"}
        </Button>
      </CardContent>
    </Card>
  );
}
