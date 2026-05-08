import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

interface Room { id: string; name: string; price_per_night: number; status: "available" | "occupied"; }

export default function Rooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"available" | "occupied">("available");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRooms((data ?? []) as Room[]);
  };

  useEffect(() => { load(); }, []);

  const reset = () => { setEditing(null); setName(""); setPrice(""); setStatus("available"); };

  const openEdit = (r: Room) => {
    setEditing(r); setName(r.name); setPrice(String(r.price_per_night)); setStatus(r.status); setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = { name, price_per_night: Number(price), status, user_id: user.id };
    const { error } = editing
      ? await supabase.from("rooms").update(payload).eq("id", editing.id)
      : await supabase.from("rooms").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Room updated" : "Room created");
    setOpen(false); reset(); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this room?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Room deleted"); load();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

      const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
      const payload = rows
        .map((r) => {
          const map: Record<string, any> = {};
          Object.keys(r).forEach((k) => (map[norm(k)] = r[k]));
          const name = String(map.name ?? map.roomname ?? map.room ?? "").trim();
          const price = Number(map.pricepernight ?? map.price ?? map.rate ?? 0);
          const rawStatus = String(map.status ?? "available").trim().toLowerCase();
          const status = rawStatus === "occupied" ? "occupied" : "available";
          return name ? { name, price_per_night: price || 0, status, user_id: user.id } : null;
        })
        .filter(Boolean) as any[];

      if (!payload.length) {
        toast.error("No valid rows. Required column: 'name'. Optional: 'price_per_night', 'status'.");
      } else {
        const { error } = await supabase.from("rooms").insert(payload);
        if (error) toast.error(error.message);
        else toast.success(`Imported ${payload.length} room(s)`);
        load();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-muted-foreground">Manage your rental inventory</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />{importing ? "Importing..." : "Import Excel"}
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Room</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Room" : "New Room"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={e => setName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Price per night</Label><Input type="number" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Rooms ({rooms.length})</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Excel columns supported: <code>name</code> (required), <code>price_per_night</code>, <code>status</code> (available/occupied).
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price/night</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rooms.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>${Number(r.price_per_night).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={r.status === "available" ? "secondary" : "default"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!rooms.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No rooms yet. Add your first one.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
