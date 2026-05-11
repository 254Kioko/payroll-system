import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function GuestRegister() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const validOwner = !!ownerId && UUID_RE.test(ownerId);

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [occupants, setOccupants] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validOwner) return toast.error("Invalid registration link");

    const name = fullName.trim();
    const idn = idNumber.trim();
    const ph = phone.trim();
    const occ = parseInt(occupants, 10);

    if (name.length < 2 || name.length > 120) return toast.error("Enter a valid full name");
    if (idn.length < 4 || idn.length > 30) return toast.error("Enter a valid ID number");
    if (ph.length < 7 || ph.length > 20) return toast.error("Enter a valid phone number");
    if (!gender) return toast.error("Select gender");
    if (!occ || occ < 1 || occ > 50) return toast.error("Enter valid number of occupants");

    setSubmitting(true);
    const { error } = await supabase.from("guest_registrations").insert({
      full_name: name, id_number: idn, phone: ph, gender, occupants: occ,
      owner_id: ownerId,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-2">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle>Guest Registration</CardTitle>
          <CardDescription>Please fill in your details to check in</CardDescription>
        </CardHeader>
        <CardContent>
          {!validOwner ? (
            <div className="text-center py-8 space-y-3">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h3 className="text-lg font-semibold">Invalid registration link</h3>
              <p className="text-muted-foreground text-sm">
                Please contact the front desk for a valid link.
              </p>
            </div>
          ) : done ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Thank you!</h3>
              <p className="text-muted-foreground text-sm">Your registration has been submitted. Please proceed to the front desk.</p>
              <Button variant="outline" onClick={() => {
                setFullName(""); setIdNumber(""); setPhone(""); setGender(""); setOccupants("1"); setDone(false);
              }}>Submit another</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full ID Names</Label>
                <Input id="fullName" required maxLength={120} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="As shown on your ID" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number</Label>
                <Input id="idNumber" required maxLength={30} value={idNumber} onChange={e => setIdNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" required maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXX" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="occupants">Number of Occupants</Label>
                  <Input id="occupants" type="number" min={1} max={50} required value={occupants} onChange={e => setOccupants(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Registration"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
