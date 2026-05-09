import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function Support() {
  const { user } = useAuth();

  const [issue, setIssue] = useState("");

  const sendToWhatsApp = () => {
    if (!issue.trim()) {
      return toast.error("Please describe the issue");
    }

    const message = `
System Support Request

User: ${user?.email}

Issue:
${issue}
    `;

    const whatsappUrl = `https://wa.me/254742048000?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");

    toast.success("Redirecting to WhatsApp...");
    setIssue("");
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Support Center</CardTitle>

          <CardDescription>
            Report technical issues or request assistance
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Describe the issue</Label>

            <Textarea
              placeholder="Example: Booking page not loading..."
              rows={6}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            />
          </div>

          <Button onClick={sendToWhatsApp} className="w-full">
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Support 
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
