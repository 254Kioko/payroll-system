import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { DollarSign, TrendingDown, TrendingUp, BedDouble } from "lucide-react";
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

type Range = "weekly" | "monthly" | "month";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Dashboard() {
  const [range, setRange] = useState<Range>("monthly");
  const today = new Date();
  const [month, setMonth] = useState<number>(today.getMonth());
  const [year, setYear] = useState<number>(today.getFullYear());
  const [bookings, setBookings] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [roomCount, setRoomCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: e }, { count }] = await Promise.all([
        supabase.from("bookings").select("total_amount, check_in_date, payment_status"),
        supabase.from("expenses").select("amount, date"),
        supabase.from("rooms").select("*", { count: "exact", head: true }),
      ]);
      setBookings(b ?? []); setExpenses(e ?? []); setRoomCount(count ?? 0);
    })();
  }, []);

  const years = useMemo(() => {
    const ys = new Set<number>([today.getFullYear()]);
    bookings.forEach(b => b.check_in_date && ys.add(new Date(b.check_in_date).getFullYear()));
    expenses.forEach(x => x.date && ys.add(new Date(x.date).getFullYear()));
    return Array.from(ys).sort((a, b) => b - a);
  }, [bookings, expenses]);

  const { income, expense, profit, chartData, label } = useMemo(() => {
    let startDate: Date, endDate: Date, days: Date[], label: string;

    if (range === "month") {
      startDate = startOfMonth(new Date(year, month, 1));
      endDate = endOfMonth(startDate);
      days = eachDayOfInterval({ start: startDate, end: endDate });
      label = `${MONTHS[month]} ${year}`;
    } else {
      const back = range === "weekly" ? 6 : 29;
      endDate = today;
      startDate = subDays(today, back);
      days = eachDayOfInterval({ start: startDate, end: endDate });
      label = range === "weekly" ? "Last 7 days" : "Last 30 days";
    }

    const startKey = format(startDate, "yyyy-MM-dd");
    const endKey = format(endDate, "yyyy-MM-dd");
    const inRange = (d: string) => d >= startKey && d <= endKey;

    const income = bookings
      .filter(b => b.check_in_date && inRange(b.check_in_date) && b.payment_status === "paid")
      .reduce((s, b) => s + Number(b.total_amount), 0);
    const expense = expenses
      .filter(x => x.date && inRange(x.date))
      .reduce((s, x) => s + Number(x.amount), 0);

    const chartData = days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      const inc = bookings.filter(b => b.check_in_date === key && b.payment_status === "paid").reduce((s, b) => s + Number(b.total_amount), 0);
      const exp = expenses.filter(x => x.date === key).reduce((s, x) => s + Number(x.amount), 0);
      return { date: format(d, "MMM dd"), Income: inc, Expenses: exp };
    });

    return { income, expense, profit: income - expense, chartData, label };
  }, [bookings, expenses, range, month, year]);

  const monthlyBreakdown = useMemo(() => {
    const months = eachMonthOfInterval({ start: new Date(year, 0, 1), end: new Date(year, 11, 31) });
    return months.map(m => {
      const start = format(startOfMonth(m), "yyyy-MM-dd");
      const end = format(endOfMonth(m), "yyyy-MM-dd");
      const inc = bookings.filter(b => b.check_in_date && b.check_in_date >= start && b.check_in_date <= end && b.payment_status === "paid").reduce((s, b) => s + Number(b.total_amount), 0);
      const exp = expenses.filter(x => x.date && x.date >= start && x.date <= end).reduce((s, x) => s + Number(x.amount), 0);
      return { month: format(m, "MMM"), Income: inc, Expenses: exp, Profit: inc - exp };
    });
  }, [bookings, expenses, year]);

  const unpaid = bookings.filter(b => b.payment_status !== "paid").reduce((s, b) => s + Number(b.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="text-muted-foreground">Overview of your BnB performance — {label}</p></div>
        <div className="flex gap-2 flex-wrap">
          <Select value={range} onValueChange={(v: Range) => setRange(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="month">By month</SelectItem>
            </SelectContent>
          </Select>
          {range === "month" && (
            <>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total Income" value={`$${income.toFixed(2)}`} tone="success" />
        <StatCard icon={<TrendingDown className="w-5 h-5" />} label="Total Expenses" value={`$${expense.toFixed(2)}`} tone="destructive" />
        <StatCard icon={<DollarSign className="w-5 h-5" />} label={profit >= 0 ? "Profit" : "Loss"} value={`$${profit.toFixed(2)}`} tone={profit >= 0 ? "primary" : "destructive"} />
        <StatCard icon={<BedDouble className="w-5 h-5" />} label="Rooms" value={String(roomCount)} sub={`$${unpaid.toFixed(2)} unpaid`} tone="primary" />
      </div>

      <Card>
        <CardHeader><CardTitle>Income vs Expenses — {label}</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Monthly Performance — {year}</CardTitle>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: "primary" | "success" | "destructive" }) {
  const toneClass = tone === "destructive" ? "bg-destructive/10 text-destructive" : tone === "success" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground";
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${toneClass}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}
