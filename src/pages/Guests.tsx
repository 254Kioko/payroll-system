import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Download, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { exportCSV } from "@/lib/csv";
import { format } from "date-fns";

interface Guest {
  id: string;
  full_name: string;
  id_number: string;
  phone: string;
  gender: string;
  occupants: number;
  created_at: string;
  owner_id: string | null;
}

export default function Guests() {
  const { user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const shareLink = useMemo(
    () => (user ? `${window.location.origin}/guest-register/${user.id}` : ""),
    [user]
  );

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("guest_registrations")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setGuests((data ?? []) as Guest[]);
  };

  useEffect(() => { load(); }, [user?.id]);

  const remove = async (id: string) => {
    if (!confirm("Delete this registration?")) return;
    const { error } = await supabase
      .from("guest_registrations")
      .delete()
      .eq("id", id)
      .eq("owner_id", user!.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const filtered = guests.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return g.full_name.toLowerCase().includes(q) ||
      g.id_number.toLowerCase().includes(q) ||
      g.phone.toLowerCase().includes(q);
  });

  const doExport = () => exportCSV("guests.csv", filtered.map(g => ({
    submitted: g.created_at,
    full_name: g.full_name,
    id_number: g.id_number,
    phone: g.phone,
    gender: g.gender,
    occupants: g.occupants,
  })));

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    toast.success("Link copied");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Guests</h1>
          <p className="text-muted-foreground">Submissions from your public registration form</p>
        </div>
        <Button variant="outline" onClick={doExport}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your registration link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={shareLink} />
            <Button variant="outline" onClick={copyLink}><Copy className="w-4 h-4 mr-2" />Copy</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Share this link with your guests. Submissions are private to your account.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrations ({filtered.length})</CardTitle>
          <div className="relative pt-2 max-w-sm">
            <Search className="w-4 h-4 absolute left-2 top-1/2 translate-y-1 text-muted-foreground" />
            <Input placeholder="Search name, ID, phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Occupants</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(g.created_at), "PP p")}</TableCell>
                  <TableCell className="font-medium">{g.full_name}</TableCell>
                  <TableCell>{g.id_number}</TableCell>
                  <TableCell>{g.phone}</TableCell>
                  <TableCell className="capitalize">{g.gender}</TableCell>
                  <TableCell>{g.occupants}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => remove(g.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !filtered.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No registrations yet.</TableCell></TableRow>
              )}
              {loading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
