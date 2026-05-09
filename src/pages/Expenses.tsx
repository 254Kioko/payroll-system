import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { exportCSV } from "@/lib/csv";

const CATEGORIES = ["rent", "water", "electricity", "maintenance", "other"] as const;
type Category = typeof CATEGORIES[number];
const NONE = "__none__";

interface Room { id: string; name: string; }
interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string | null;
  date: string;
  room_id: string | null;
}

export default function Expenses() {
  const { user } = useAuth();
  const [items, setItems] = useState<Expense[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [customCategory, setCustomCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roomId, setRoomId] = useState<string>(NONE);

  const load = async () => {
    const [{ data: e, error }, { data: r }] = await Promise.all([
      supabase.from("expenses").select("*").order("date", { ascending: false }),
      supabase.from("rooms").select("id, name").order("name"),
    ]);
    if (error) return toast.error(error.message);
    setItems((e ?? []) as Expense[]);
    setRooms((r ?? []) as Room[]);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (category !== "other") setCustomCategory(""); }, [category]);

  const reset = () => {
    setEditing(null);
    setAmount(""); setDesc(""); setCategory("other"); setCustomCategory("");
    setDate(new Date().toISOString().slice(0, 10));
    setRoomId(NONE);
  };

  const openEdit = (i: Expense) => {
    setEditing(i);
    setAmount(String(i.amount));
    setCategory(i.category);
    if (i.category === "other") setCustomCategory(i.description ?? "");
    else setDesc(i.description ?? "");
    setDate(i.date);
    setRoomId(i.room_id ?? NONE);
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const payload = {
      user_id: user.id,
      amount: Number(amount),
      category,
      description: category === "other" ? customCategory : (desc || null),
      date,
      room_id: roomId === NONE ? null : roomId,
    };
    const { error } = editing
      ? await supabase.from("expenses").update(payload).eq("id", editing.id)
      : await supabase.from("expenses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Expense updated" : "Expense added");
    setOpen(false); reset(); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const roomName = (id: string | null) => (id ? rooms.find(r => r.id === id)?.name ?? "—" : "—");

  const doExport = () =>
    exportCSV("expenses.csv", items.map(i => ({
      date: i.date, category: i.category, amount: i.amount,
      room: roomName(i.room_id), description: i.description ?? "",
    })));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track operational costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={doExport}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit Expense" : "New Expense"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Room (optional)</Label>
                  <Select value={roomId} onValueChange={setRoomId}>
                    <SelectTrigger><SelectValue placeholder="General / unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>General (no specific room)</SelectItem>
                      {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {category === "other" && (
                  <div className="space-y-2">
                    <Label>Custom Category</Label>
                    <Input placeholder="e.g. internet, cleaning, supplies" value={customCategory} onChange={e => setCustomCategory(e.target.value)} required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
                </div>
                {category !== "other" && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={desc} onChange={e => setDesc(e.target.value)} />
                  </div>
                )}
                <DialogFooter><Button type="submit">Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All Expenses</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(i => (
                <TableRow key={i.id}>
                  <TableCell>{i.date}</TableCell>
                  <TableCell className="capitalize">{i.category}</TableCell>
                  <TableCell>{roomName(i.room_id)}</TableCell>
                  <TableCell>KSh {Number(i.amount).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{i.description}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No expenses yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
