import { useEffect, useMemo, useState } from "react";
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
import { Plus, Trash2, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import { exportCSV } from "@/lib/csv";

interface Room { id: string; name: string; price_per_night: number; }
interface Booking {
  id: string; room_id: string; client_name: string;
  check_in_date: string; check_out_date: string;
  total_amount: number; payment_status: "paid" | "unpaid" | "partial";
  rooms?: { name: string };
}

export default function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "partial">("all");

  const [roomId, setRoomId] = useState("");
  const [client, setClient] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [payment, setPayment] = useState<"paid" | "unpaid" | "partial">("unpaid");

  const load = async () => {
    const [{ data: b }, { data: r }] = await Promise.all([
      supabase.from("bookings").select("*, rooms(name)").order("check_in_date", { ascending: false }),
      supabase.from("rooms").select("id,name,price_per_night").order("name"),
    ]);
    setBookings((b ?? []) as Booking[]);
    setRooms((r ?? []) as Room[]);
  };

  useEffect(() => { load(); }, []);

  const selectedRoom = rooms.find(r => r.id === roomId);
  const computedTotal = useMemo(() => {
    if (!selectedRoom || !checkIn || !checkOut) return 0;
    const days = Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn)));
    return days * Number(selectedRoom.price_per_night);
  }, [selectedRoom, checkIn, checkOut]);

  const reset = () => { setRoomId(""); setClient(""); setCheckIn(""); setCheckOut(""); setPayment("unpaid"); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id, room_id: roomId, client_name: client,
      check_in_date: checkIn, check_out_date: checkOut,
      total_amount: computedTotal, payment_status: payment,
    });
    if (error) return toast.error(error.message);
    toast.success("Booking created");
    setOpen(false); reset(); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const updatePayment = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ payment_status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = bookings.filter(b => {
    if (filter !== "all" && b.payment_status !== filter) return false;
    if (search && !b.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const doExport = () => exportCSV("bookings.csv", filtered.map(b => ({
    client: b.client_name, room: b.rooms?.name ?? "",
    check_in: b.check_in_date, check_out: b.check_out_date,
    total: b.total_amount, payment: b.payment_status,
  })));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Bookings</h1><p className="text-muted-foreground">Check-in, check-out & payments</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={doExport}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Booking</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-2"><Label>Room</Label>
                  <Select value={roomId} onValueChange={setRoomId} required>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name} — KSh {r.price_per_night}/night</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Client name</Label><Input required value={client} onChange={e => setClient(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Check-in</Label><Input type="date" required value={checkIn} onChange={e => setCheckIn(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Check-out</Label><Input type="date" required value={checkOut} onChange={e => setCheckOut(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Payment</Label>
                  <Select value={payment} onValueChange={(v: any) => setPayment(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 rounded-md bg-muted text-sm">Total: <strong>${computedTotal.toFixed(2)}</strong></div>
                <DialogFooter><Button type="submit" disabled={!roomId}>Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <div className="flex gap-2 flex-wrap pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Room</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Total</TableHead><TableHead>Payment</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {filtered.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.client_name}</TableCell>
                  <TableCell>{b.rooms?.name}</TableCell>
                  <TableCell>{b.check_in_date}</TableCell>
                  <TableCell>{b.check_out_date}</TableCell>
                  <TableCell>${Number(b.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Select value={b.payment_status} onValueChange={(v) => updatePayment(b.id, v)}>
                      <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                </TableRow>
              ))}
              {!filtered.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No bookings found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
