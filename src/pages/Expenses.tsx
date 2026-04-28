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
import { Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { exportCSV } from "@/lib/csv";

const CATEGORIES = ["rent", "water", "electricity", "maintenance", "other"] as const;
type Category = typeof CATEGORIES[number];

interface Expense { id: string; amount: number; category: Category; description: string | null; date: string; }

export default function Expenses() {
  const { user } = useAuth();
  const [items, setItems] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false });
    if (error) return toast.error(error.message);
    setItems((data ?? []) as Expense[]);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("expenses").insert({
      user_id: user.id, amount: Number(amount), category, description: desc || null, date,
    });
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    setOpen(false); setAmount(""); setDesc(""); setCategory("other"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const doExport = () => exportCSV("expenses.csv", items.map(i => ({
    date: i.date, category: i.category, amount: i.amount, description: i.description ?? "",
  })));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Expenses</h1><p className="text-muted-foreground">Track operational costs</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={doExport}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" required value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
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
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {items.map(i => (
                <TableRow key={i.id}>
                  <TableCell>{i.date}</TableCell>
                  <TableCell className="capitalize">{i.category}</TableCell>
                  <TableCell>${Number(i.amount).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{i.description}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove(i.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
              {!items.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No expenses yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
