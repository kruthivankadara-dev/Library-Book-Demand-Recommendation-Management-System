
"use client";

import { useEffect, useState, type FormEvent } from "react";

const API = "http://localhost:5000/api";

type Book = {
  book_id: number;
  title: string;
  author: string;
  category: string;
  publication_year?: number;
};

type Demand = {
  demand_id: number;
  book_id: number;
  title: string;
  author: string;
  category: string;
  request_count: number;
  loan_count: number;
};

type Member = {
  member_id: number;
  full_name: string;
  email?: string;
  department?: string | null;
};

type Recommendation = {
  book_id: number;
  title: string;
  author: string;
  category: string;
  average_rating: number;
  loan_count: number;
  request_count: number;
  score: number;
  reasons: string[];
};

type Loan = {
  loan_id: number;
  member_id: number;
  book_id: number;
  full_name: string;
  title: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
};

type Reservation = {
  reservation_id: number;
  full_name: string;
  title: string;
  reservation_date: string;
  status: string;
  queue_position: number | null;
};

type OverdueLoan = {
  loan_id: number;
  member_id: number;
  book_id: number;
  full_name: string;
  email: string;
  title: string;
  author: string;
  category: string;
  issue_date: string;
  due_date: string;
  status: string;
  days_overdue: number;
};

type RecommendationResponse = {
  recommendations: Recommendation[];
};

type OverdueResponse = {
  message: string;
  total_overdue: number;
  newly_marked_overdue: number;
  analytics_logged: number;
  overdue_loans: OverdueLoan[];
};

type Section =
  | "overview"
  | "books"
  | "members"
  | "demand"
  | "recommendations"
  | "loans"
  | "reservations";

function formatDate(value: string | null) {
  if (!value) return "â€”";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const style =
    normalized === "borrowed" || normalized === "active"
      ? "bg-blue-100 text-blue-800"
      : normalized === "returned" || normalized === "fulfilled"
      ? "bg-green-100 text-green-800"
      : normalized === "overdue"
      ? "bg-red-100 text-red-800"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      {description && (
        <p className="mt-2 text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-cyan-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function Home() {
  // Authentication
  const [token, setToken] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard data
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [demand, setDemand] = useState<Demand[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [overdueLoans, setOverdueLoans] = useState<OverdueLoan[]>([]);

  // Recommendations
  const [selectedMember, setSelectedMember] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const [recommendationLoaded, setRecommendationLoaded] = useState(false);

  // UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loanSearch, setLoanSearch] = useState("");
  const [reservationSearch, setReservationSearch] = useState("");

  // Add book form
const [showAddBook, setShowAddBook] = useState(false);
const [bookForm, setBookForm] = useState({
  isbn: "",
  title: "",
  author: "",
  category: "",
  publisher: "",
  publication_year: "",
  description: "",
  language: "English",
});
const [bookLoading, setBookLoading] = useState(false);
const [bookMessage, setBookMessage] = useState("");
const [bookError, setBookError] = useState("");

  // Add member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    full_name: "",
    email: "",
    department: "",
  });
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberMessage, setMemberMessage] = useState("");
  const [memberError, setMemberError] = useState("");

  // Issue book form
  const [issueMemberId, setIssueMemberId] = useState("");
  const [issueBookId, setIssueBookId] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueMessage, setIssueMessage] = useState("");
  const [issueError, setIssueError] = useState("");

  // Return book
  const [returningLoanId, setReturningLoanId] = useState<number | null>(null);
  const [loanActionMessage, setLoanActionMessage] = useState("");
  const [loanActionError, setLoanActionError] = useState("");

  // Refresh
  const [refreshing, setRefreshing] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // Login
  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (data.user?.role !== "ADMIN") {
        throw new Error("Please use an administrator account.");
      }

      setToken(data.token);
      setLoginPassword("");
      setError("");
      setLoading(true);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : "Unable to log in."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // Logout
  function handleLogout() {
    setToken("");
    setLoginPassword("");
    setBooks([]);
    setMembers([]);
    setDemand([]);
    setLoans([]);
    setReservations([]);
    setOverdueLoans([]);
    setRecommendations([]);
    setSelectedMember("");
    setRecommendationLoaded(false);
    setError("");
    setLoginError("");
    setActiveSection("overview");
    setLoading(true);
  }

  // Load all dashboard resources
  async function loadAllData(currentToken: string) {
    const headers = {
      Authorization: `Bearer ${currentToken}`,
    };

    const [
      booksRes,
      membersRes,
      demandRes,
      loansRes,
      reservationsRes,
      overdueRes,
    ] = await Promise.all([
      fetch(`${API}/books`),
      fetch(`${API}/members`, { headers }),
      fetch(`${API}/demand`, { headers }),
      fetch(`${API}/loans`, { headers }),
      fetch(`${API}/reservations`, { headers }),
      fetch(`${API}/loans/overdue`, { headers }),
    ]);

    const responses = [
      booksRes,
      membersRes,
      demandRes,
      loansRes,
      reservationsRes,
      overdueRes,
    ];

    if (responses.some((response) => response.status === 401 ||
        response.status === 403)) {
      throw new Error(
        "Your administrator session is invalid or expired. Please log in again."
      );
    }

    if (responses.some((response) => !response.ok)) {
      throw new Error("Some library data could not be loaded.");
    }

    const booksData: Book[] = await booksRes.json();
    const membersData: Member[] = await membersRes.json();
    const demandData: Demand[] = await demandRes.json();
    const loansData: Loan[] = await loansRes.json();
    const reservationsData: Reservation[] = await reservationsRes.json();
    const overdueData: OverdueResponse = await overdueRes.json();

    setBooks(booksData);
    setMembers(membersData);
    setDemand(demandData);
    setLoans(loansData);
    setReservations(reservationsData);
    setOverdueLoans(overdueData.overdue_loans || []);

    if (membersData.length > 0) {
      setSelectedMember((previous) =>
        previous || String(membersData[0].member_id)
      );
      setIssueMemberId((previous) =>
        previous || String(membersData[0].member_id)
      );
    }

    if (booksData.length > 0) {
      setIssueBookId((previous) =>
        previous || String(booksData[0].book_id)
      );
    }
  }

  // Initial load after login
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadDashboard() {
      try {
        await loadAllData(token);
      } catch (err) {
        if (cancelled) return;

        console.error("Dashboard loading error:", err);

        const message =
          err instanceof Error ? err.message : "Could not load library data.";

        setError(message);

        if (message.includes("session is invalid")) {
          setToken("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Recommendations
  useEffect(() => {
    if (!selectedMember || !token) {
  return;
}

    const controller = new AbortController();

    async function loadRecommendations() {
      setRecommendationLoading(true);
      setRecommendationError("");
      setRecommendationLoaded(false);

      try {
        const response = await fetch(
          `${API}/recommendations/${selectedMember}`,
          {
            signal: controller.signal,
            headers: {
  Authorization: `Bearer ${token}`,
},
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || data.error || "Could not load recommendations."
          );
        }

        const result = data as RecommendationResponse;

        setRecommendations(result.recommendations || []);
        setRecommendationLoaded(true);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setRecommendationError(
          err instanceof Error ? err.message : "Recommendation error."
        );
        setRecommendations([]);
      } finally {
        if (!controller.signal.aborted) {
          setRecommendationLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => controller.abort();
  }, [selectedMember, token]);

  // Refresh all data
  async function handleRefresh() {
    if (!token) return;

    setRefreshing(true);
    setError("");

    try {
      await loadAllData(token);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not refresh data."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // Add a new book
async function handleAddBook(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();

  setBookMessage("");
  setBookError("");
  setBookLoading(true);

  try {
    const response = await fetch(`${API}/books`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...bookForm,
        publication_year: bookForm.publication_year
          ? Number(bookForm.publication_year)
          : null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not add book.");
    }

    setBookMessage(
      `Book added successfully! New Book ID: ${data.book_id}`
    );

    setBookForm({
      isbn: "",
      title: "",
      author: "",
      category: "",
      publisher: "",
      publication_year: "",
      description: "",
      language: "English",
    });

    setShowAddBook(false);

    await loadAllData(token);

  } catch (err) {
    setBookError(
      err instanceof Error ? err.message : "Failed to add book."
    );
  } finally {
    setBookLoading(false);
  }
}

  // Add a new member
  async function handleAddMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemberMessage("");
    setMemberError("");
    setMemberLoading(true);

    try {
      const response = await fetch(`${API}/members`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: memberForm.full_name.trim(),
          email: memberForm.email.trim(),
          department: memberForm.department.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not add member.");
      }

      setMemberMessage(
        `Member added successfully! New Member ID: ${data.member_id}`
      );
      setMemberForm({ full_name: "", email: "", department: "" });
      setShowAddMember(false);
      await loadAllData(token);
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Failed to add member."
      );
    } finally {
      setMemberLoading(false);
    }
  }

  // Issue book
  async function handleIssueBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIssueMessage("");
    setIssueError("");
    setIssueLoading(true);

    try {
      const response = await fetch(`${API}/loans`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_id: Number(issueMemberId),
          book_id: Number(issueBookId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Could not issue book.");
      }

      setIssueMessage(
        `${data.message || "Book issued successfully."} Loan ID: ${data.loan?.loan_id ?? "Created"}`
      );

      await loadAllData(token);
    } catch (err) {
      setIssueError(
        err instanceof Error ? err.message : "Book issue failed."
      );
    } finally {
      setIssueLoading(false);
    }
  }

  // Return book
  async function handleReturnBook(loanId: number) {
    const confirmed = window.confirm(
      `Are you sure you want to return loan ID ${loanId}?`
    );

    if (!confirmed) return;

    setReturningLoanId(loanId);
    setLoanActionMessage("");
    setLoanActionError("");

    try {
      const response = await fetch(`${API}/loans/${loanId}/return`, {
        method: "PUT",
        headers: authHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Could not return book.");
      }

      setLoanActionMessage(data.message || "Book returned successfully.");

      await loadAllData(token);
    } catch (err) {
      setLoanActionError(
        err instanceof Error ? err.message : "Book return failed."
      );
    } finally {
      setReturningLoanId(null);
    }
  }

  // Calculations
  const totalRequests = demand.reduce(
    (sum, item) => sum + Number(item.request_count || 0),
    0
  );

  const totalDemandLoans = demand.reduce(
    (sum, item) => sum + Number(item.loan_count || 0),
    0
  );

  const activeLoans = loans.filter(
    (loan) => loan.status === "Borrowed" || loan.status === "Overdue"
  ).length;

  const returnedLoans = loans.filter(
    (loan) => loan.status === "Returned"
  ).length;

  const sortedDemand = [...demand].sort(
    (a, b) => b.request_count - a.request_count
  );

  const maxRequests = Math.max(
    1,
    ...demand.map((item) => Number(item.request_count || 0))
  );

  const categories = [
    "All",
    ...Array.from(new Set(books.map((book) => book.category))),
  ];

  const filteredBooks = books.filter((book) => {
    const search = searchTerm.toLowerCase();

    return (
      (book.title.toLowerCase().includes(search) ||
        book.author.toLowerCase().includes(search)) &&
      (selectedCategory === "All" ||
        book.category === selectedCategory)
    );
  });

  const filteredLoans = loans.filter((loan) => {
    const search = loanSearch.toLowerCase();

    return (
      loan.full_name.toLowerCase().includes(search) ||
      loan.title.toLowerCase().includes(search) ||
      String(loan.loan_id).includes(search)
    );
  });

  const filteredReservations = reservations.filter((reservation) => {
    const search = reservationSearch.toLowerCase();

    return (
      reservation.full_name.toLowerCase().includes(search) ||
      reservation.title.toLowerCase().includes(search) ||
      String(reservation.reservation_id).includes(search)
    );
  });

  const navigation: { id: Section; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "âŒ‚" },
    { id: "books", label: "Book Catalogue", icon: "â–¤" },
    { id: "members", label: "Members", icon: "â™™" },
    { id: "demand", label: "Demand Analysis", icon: "â–¥" },
    { id: "recommendations", label: "Recommendations", icon: "âœ§" },
    { id: "loans", label: "Loans & Returns", icon: "â‡„" },
    { id: "reservations", label: "Reservations & Overdue", icon: "â—·" },
  ];


  // Login screen
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-900 shadow-xl">

          {/* Library Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-950">
              <div className="relative h-10 w-10">
                <span className="absolute left-1 top-1 h-6 w-5 rounded-sm bg-lime-400 shadow-sm" />
                <span className="absolute left-3 top-3 h-6 w-5 rounded-sm bg-cyan-400 shadow-sm" />
                <span className="absolute left-0 top-4 h-5 w-5 rounded-sm bg-emerald-400 shadow-sm" />
                <span className="absolute left-4 top-5 h-5 w-5 rounded-sm bg-blue-500 shadow-sm" />
              </div>
            </div>

            <p className="text-sm font-bold uppercase tracking-widest text-cyan-700">
              Library Intelligence
            </p>

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              Administrator Login
            </h1>

            <p className="mt-3 text-base text-slate-500">
              Log in to access the Library Book Demand and Recommendation Dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="space-y-5">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Email
                </label>

                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  placeholder="Administrator email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-900">
                  Password
                </label>

                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                  placeholder="Enter password"
                />
              </div>

            </div>

            {loginError && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="mt-7 w-full rounded-xl bg-slate-950 px-4 py-4 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loginLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-200 pt-6 text-center">

            <p className="text-sm text-slate-600">
              Are you a library member?
            </p>

            <a
              href="/login"
              className="mt-2 inline-block font-semibold text-cyan-700 hover:underline"
            >
              Member Login â†’
            </a>

            <p className="mt-5 text-sm text-slate-600">
              New to the library?{" "}
              <a
                href="/register"
                className="font-semibold text-cyan-700 hover:underline"
              >
                Register here
              </a>
            </p>

          </div>
        </div>
      </main>
    );
  }


  // Dashboard
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 px-6 py-7 text-white md:px-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Library Intelligence
            </p>

            <h1 className="mt-2 text-2xl font-bold md:text-4xl">
              Library Book Demand & Recommendation System
            </h1>

            <p className="mt-2 text-slate-300">
              Smart library management, circulation and reader intelligence.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-3 md:px-12">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeSection === item.id
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-8 md:px-12">
        {loading ? (
          <div className="rounded-xl bg-white p-8 text-slate-600 shadow-sm">
            Loading library data...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
            <button
              onClick={handleRefresh}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {activeSection === "overview" && (
              <div className="space-y-8">
                <SectionTitle
                  eyebrow="Administrator Dashboard"
                  title="Library Overview"
                  description="A consolidated view of books, circulation, demand and reservations."
                />

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="Total Books" value={books.length} />
                  <StatCard label="Total Members" value={members.length} />
                  <StatCard label="Total Requests" value={totalRequests} />
                  <StatCard label="Demand-record Loans" value={totalDemandLoans} />
                  <StatCard label="Active Loans" value={activeLoans} />
                  <StatCard label="Returned Loans" value={returnedLoans} />
                  <StatCard label="Reservations" value={reservations.length} />
                  <StatCard label="Overdue Books" value={overdueLoans.length} />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <button
                    onClick={() => setActiveSection("loans")}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-cyan-400"
                  >
                    <p className="text-sm font-semibold uppercase tracking-wider text-cyan-700">
                      Circulation
                    </p>
                    <h3 className="mt-2 text-xl font-bold">
                      Loans and Returns
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Issue books, view loan records and process returns.
                    </p>
                    <p className="mt-4 font-semibold text-cyan-700">
                      Open section â†’
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveSection("reservations")}
                    className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-cyan-400"
                  >
                    <p className="text-sm font-semibold uppercase tracking-wider text-cyan-700">
                      Queue Monitoring
                    </p>
                    <h3 className="mt-2 text-xl font-bold">
                      Reservations and Overdue
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Monitor reservations, queue positions and overdue books.
                    </p>
                    <p className="mt-4 font-semibold text-cyan-700">
                      Open section â†’
                    </p>
                  </button>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold">Highest Demand Books</h3>

                  <div className="mt-5 space-y-5">
                    {sortedDemand.slice(0, 5).map((item) => (
                      <div key={item.demand_id}>
                        <div className="mb-2 flex justify-between gap-3 text-sm">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-slate-500">
                            {item.request_count} requests
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-cyan-600"
                            style={{
                              width: `${
                                (Number(item.request_count) / maxRequests) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BOOK CATALOGUE */}
            {activeSection === "books" && (
              <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-5 grid gap-3 md:grid-cols-2">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title or author..."
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-cyan-600"
                  />

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category === "All" ? "All Categories" : category}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mb-3 text-sm text-slate-500">
                  Showing {filteredBooks.length} of {books.length} books
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-3">ID</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Author</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Year</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredBooks.map((book) => (
                        <tr key={book.book_id} className="border-b">
                          <td className="p-3">{book.book_id}</td>
                          <td className="p-3 font-medium">{book.title}</td>
                          <td className="p-3">{book.author}</td>
                          <td className="p-3">{book.category}</td>
                          <td className="p-3">{book.publication_year || "â€”"}</td>
                        </tr>
                      ))}

                      {filteredBooks.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500">
                            No books found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                          {/* Add Book Controls */}
<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
  <div>
    <h3 className="text-lg font-bold">Manage Books</h3>
    <p className="text-sm text-slate-500">
      Add new books to the library catalogue.
    </p>
  </div>

  <button
    onClick={() => {
      setShowAddBook(!showAddBook);
      setBookMessage("");
      setBookError("");
    }}
    className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
  >
    {showAddBook ? "Cancel" : "+ Add New Book"}
  </button>
</div>

{bookMessage && (
  <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
    {bookMessage}
  </p>
)}

{bookError && (
  <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
    {bookError}
  </p>
)}

{showAddBook && (
  <form
    onSubmit={handleAddBook}
    className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-5"
  >
    <h3 className="mb-5 text-lg font-bold">Add New Book</h3>

    <div className="grid gap-4 md:grid-cols-2">

      <input
        required
        maxLength={200}
        placeholder="Book Title *"
        value={bookForm.title}
        onChange={(e) =>
          setBookForm({ ...bookForm, title: e.target.value })
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
      />

      <input
        required
        maxLength={150}
        placeholder="Author *"
        value={bookForm.author}
        onChange={(e) =>
          setBookForm({ ...bookForm, author: e.target.value })
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
      />

      <input
        maxLength={20}
        placeholder="ISBN"
        value={bookForm.isbn}
        onChange={(e) =>
          setBookForm({ ...bookForm, isbn: e.target.value })
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
      />

      <input
        maxLength={100}
        placeholder="Category"
        value={bookForm.category}
        onChange={(e) =>
          setBookForm({ ...bookForm, category: e.target.value })
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
      />

      <input
        maxLength={150}
        placeholder="Publisher"
        value={bookForm.publisher}
        onChange={(e) =>
          setBookForm({ ...bookForm, publisher: e.target.value })
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
      />

      <input
        type="number"
        min="1901"
        max="2155"
        placeholder="Publication Year"
        value={bookForm.publication_year}
        onChange={(e) =>
          setBookForm({
            ...bookForm,
            publication_year: e.target.value,
          })
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
      />

      <input
        maxLength={50}
        placeholder="Language"
        value={bookForm.language}
        onChange={(e) =>
          setBookForm({ ...bookForm, language: e.target.value })
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
      />

      <textarea
        placeholder="Book Description"
        value={bookForm.description}
        onChange={(e) =>
          setBookForm({ ...bookForm, description: e.target.value })
        }
        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 md:col-span-2"
        rows={3}
      />

    </div>

    <button
      type="submit"
      disabled={bookLoading}
      className="mt-5 rounded-lg bg-cyan-700 px-6 py-3 font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
    >
      {bookLoading ? "Adding Book..." : "Add Book to Catalogue"}
    </button>
  </form>
)}

</section>
            )}



            {/* MEMBER MANAGEMENT */}
            {activeSection === "members" && (
              <section className="rounded-2xl bg-white p-6 shadow-sm">
                <SectionTitle
                  eyebrow="Reader Records"
                  title="Member Management"
                  description="View registered library members."
                />

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <StatCard label="Registered Members" value={members.length} />
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMember(!showAddMember);
                      setMemberMessage("");
                      setMemberError("");
                    }}
                    className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    {showAddMember ? "Cancel" : "+ Add New Member"}
                  </button>
                </div>

                {memberMessage && (
                  <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                    {memberMessage}
                  </p>
                )}
                {memberError && (
                  <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {memberError}
                  </p>
                )}

                {showAddMember && (
                  <form
                    onSubmit={handleAddMember}
                    className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <h3 className="mb-5 text-lg font-bold">Register New Member</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <input
                        required
                        maxLength={100}
                        placeholder="Full Name *"
                        value={memberForm.full_name}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, full_name: e.target.value })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                      />
                      <input
                        required
                        type="email"
                        maxLength={150}
                        placeholder="Email Address *"
                        value={memberForm.email}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, email: e.target.value })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                      />
                      <input
                        maxLength={100}
                        placeholder="Department"
                        value={memberForm.department}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, department: e.target.value })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={memberLoading}
                      className="mt-5 rounded-lg bg-cyan-700 px-6 py-3 font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
                    >
                      {memberLoading ? "Adding Member..." : "Save Member"}
                    </button>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-3">Member ID</th>
                        <th className="p-3">Full Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Department</th>
                      </tr>
                    </thead>

                    <tbody>
                      {members.map((member) => (
                        <tr key={member.member_id} className="border-b">
                          <td className="p-3">{member.member_id}</td>
                          <td className="p-3 font-medium">{member.full_name}</td>
                          <td className="p-3">{member.email || "â€”"}</td>
                          <td className="p-3">{member.department || "â€”"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* DEMAND ANALYSIS */}
            {activeSection === "demand" && (
              <section className="rounded-2xl bg-white p-6 shadow-sm">
                <SectionTitle
                  eyebrow="Library Analytics"
                  title="Book Demand Analysis"
                  description="Books ranked by recorded request count and loan activity."
                />

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                  <StatCard label="Demand Records" value={demand.length} />
                  <StatCard label="Total Requests" value={totalRequests} />
                  <StatCard label="Recorded Loans" value={totalDemandLoans} />
                </div>

                <div className="space-y-6">
                  {sortedDemand.map((item) => (
                    <div key={item.demand_id}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-xs text-slate-500">
                            {item.category} Â· {item.author}
                          </p>
                        </div>

                        <p className="text-sm text-slate-500">
                          {item.request_count} requests Â· {item.loan_count} loans
                        </p>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-cyan-600"
                          style={{
                            width: `${
                              (Number(item.request_count) / maxRequests) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* HYBRID RECOMMENDATIONS */}
            {activeSection === "recommendations" && (
              <section className="rounded-2xl bg-white p-6 shadow-sm">
                <SectionTitle
                  eyebrow="Intelligent Suggestions"
                  title="Hybrid Book Recommendations"
                  description="Personalized suggestions using reading interests, ratings, borrowing activity and demand."
                />

                <div className="mb-6 max-w-md">
                  <label className="mb-2 block text-sm font-medium">
                    Select reader
                  </label>

                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                  >
                    {members.map((member) => (
                      <option
                        key={member.member_id}
                        value={String(member.member_id)}
                      >
                        {member.full_name} (ID: {member.member_id})
                      </option>
                    ))}
                  </select>
                </div>

                {recommendationLoading ? (
                  <p className="rounded-lg bg-slate-50 p-5">
                    Generating recommendations...
                  </p>
                ) : recommendationError ? (
                  <p className="rounded-lg bg-red-50 p-4 text-red-700">
                    {recommendationError}
                  </p>
                ) : recommendationLoaded && recommendations.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-5">
                    No recommendations available for this reader.
                  </p>
                ) : recommendationLoaded ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {recommendations.map((book, index) => (
                      <article
                        key={book.book_id}
                        className="rounded-xl border border-slate-200 p-5"
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-cyan-700">
                              RECOMMENDATION #{index + 1}
                            </p>
                            <h3 className="mt-1 font-bold">{book.title}</h3>
                            <p className="text-sm text-slate-500">{book.author}</p>
                          </div>

                          <p className="text-lg font-bold text-cyan-700">
                            {(book.score * 100).toFixed(1)}%
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            {book.category}
                          </span>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
                            Rating: {book.average_rating > 0
                              ? `${book.average_rating}/5`
                              : "Not rated"}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-slate-500">Requests</p>
                            <p className="font-semibold">{book.request_count}</p>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-3">
                            <p className="text-slate-500">Loans</p>
                            <p className="font-semibold">{book.loan_count}</p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="mb-2 text-sm font-semibold">Why this book?</p>
                          <ul className="space-y-1 text-sm text-slate-600">
                            {book.reasons.map((reason) => (
                              <li key={reason}>âœ“ {reason}</li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Select a reader to generate recommendations.
                  </p>
                )}
              </section>
            )}

            {/* LOANS AND RETURNS */}
            {activeSection === "loans" && (
              <div className="space-y-6">
                <SectionTitle
                  eyebrow="Circulation Management"
                  title="Loans and Returns"
                  description="Issue books to members, monitor loan records and process book returns."
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Total Loan Records" value={loans.length} />
                  <StatCard label="Active Loans" value={activeLoans} />
                  <StatCard label="Returned Books" value={returnedLoans} />
                </div>

                {/* Issue book form */}
                <section className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold">Issue a Book</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a library member and an available catalogue entry.
                    The backend sets the loan period to 14 days.
                  </p>

                  <form
                    onSubmit={handleIssueBook}
                    className="mt-5 grid gap-4 md:grid-cols-3"
                  >
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Select Member
                      </label>

                      <select
                        required
                        value={issueMemberId}
                        onChange={(e) => setIssueMemberId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                      >
                        <option value="">Choose member</option>
                        {members.map((member) => (
                          <option
                            key={member.member_id}
                            value={String(member.member_id)}
                          >
                            {member.full_name} (ID: {member.member_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Select Book
                      </label>

                      <select
                        required
                        value={issueBookId}
                        onChange={(e) => setIssueBookId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                      >
                        <option value="">Choose book</option>
                        {books.map((book) => (
                          <option
                            key={book.book_id}
                            value={String(book.book_id)}
                          >
                            {book.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={
                          issueLoading || !issueMemberId || !issueBookId
                        }
                        className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {issueLoading ? "Issuing..." : "Issue Book"}
                      </button>
                    </div>
                  </form>

                  {issueMessage && (
                    <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                      {issueMessage}
                    </p>
                  )}

                  {issueError && (
                    <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {issueError}
                    </p>
                  )}
                </section>

                {/* Loan records */}
                <section className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">Loan Records</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        All member borrowing records.
                      </p>
                    </div>

                    <input
                      value={loanSearch}
                      onChange={(e) => setLoanSearch(e.target.value)}
                      placeholder="Search member, book or loan ID..."
                      className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-3">Loan ID</th>
                          <th className="p-3">Member</th>
                          <th className="p-3">Book</th>
                          <th className="p-3">Issue Date</th>
                          <th className="p-3">Due Date</th>
                          <th className="p-3">Return Date</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredLoans.map((loan) => (
                          <tr key={loan.loan_id} className="border-b">
                            <td className="p-3">{loan.loan_id}</td>
                            <td className="p-3">{loan.full_name}</td>
                            <td className="p-3 font-medium">{loan.title}</td>
                            <td className="p-3">{formatDate(loan.issue_date)}</td>
                            <td className="p-3">{formatDate(loan.due_date)}</td>
                            <td className="p-3">{formatDate(loan.return_date)}</td>
                            <td className="p-3">
                              <StatusBadge status={loan.status} />
                            </td>
                            <td className="p-3">
                              {loan.status === "Borrowed" ||
                              loan.status === "Overdue" ? (
                                <button
                                  onClick={() => handleReturnBook(loan.loan_id)}
                                  disabled={returningLoanId === loan.loan_id}
                                  className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
                                >
                                  {returningLoanId === loan.loan_id
                                    ? "Returning..."
                                    : "Return"}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Completed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {filteredLoans.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-slate-500">
                              No loan records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {loanActionMessage && (
                    <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                      {loanActionMessage}
                    </p>
                  )}

                  {loanActionError && (
                    <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {loanActionError}
                    </p>
                  )}
                </section>
              </div>
            )}

            {/* RESERVATIONS AND OVERDUE */}
            {activeSection === "reservations" && (
              <div className="space-y-6">
                <SectionTitle
                  eyebrow="Queue and Circulation Monitoring"
                  title="Reservations and Overdue"
                  description="Monitor reservation queues, reservation status and books that have passed their due dates."
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    label="Total Reservations"
                    value={reservations.length}
                  />
                  <StatCard
                    label="Active Reservations"
                    value={reservations.filter(
                      (r) => r.status === "Active"
                    ).length}
                  />
                  <StatCard
                    label="Overdue Books"
                    value={overdueLoans.length}
                  />
                </div>

                {/* Reservations */}
                <section className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">Reservation Records</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Reservation status and queue position for each member.
                      </p>
                    </div>

                    <input
                      value={reservationSearch}
                      onChange={(e) => setReservationSearch(e.target.value)}
                      placeholder="Search member, book or reservation ID..."
                      className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-3">Reservation ID</th>
                          <th className="p-3">Member</th>
                          <th className="p-3">Book</th>
                          <th className="p-3">Reservation Date</th>
                          <th className="p-3">Queue Position</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredReservations.map((reservation) => (
                          <tr
                            key={reservation.reservation_id}
                            className="border-b"
                          >
                            <td className="p-3">
                              {reservation.reservation_id}
                            </td>
                            <td className="p-3">{reservation.full_name}</td>
                            <td className="p-3 font-medium">
                              {reservation.title}
                            </td>
                            <td className="p-3">
                              {formatDate(reservation.reservation_date)}
                            </td>
                            <td className="p-3">
                              {reservation.queue_position ?? "â€”"}
                            </td>
                            <td className="p-3">
                              <StatusBadge status={reservation.status} />
                            </td>
                          </tr>
                        ))}

                        {filteredReservations.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500">
                              No reservation records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Overdue records */}
                <section className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">Overdue Books</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Books whose due dates have passed and have not been returned.
                      </p>
                    </div>

                    <span className="rounded-full bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      {overdueLoans.length} overdue
                    </span>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[750px] text-left text-sm">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr>
                          <th className="p-3">Loan ID</th>
                          <th className="p-3">Member</th>
                          <th className="p-3">Book</th>
                          <th className="p-3">Due Date</th>
                          <th className="p-3">Days Overdue</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {overdueLoans.map((loan) => (
                          <tr key={loan.loan_id} className="border-b">
                            <td className="p-3">{loan.loan_id}</td>
                            <td className="p-3">
                              <p className="font-medium">{loan.full_name}</p>
                              <p className="text-xs text-slate-500">
                                {loan.email}
                              </p>
                            </td>
                            <td className="p-3">{loan.title}</td>
                            <td className="p-3">{formatDate(loan.due_date)}</td>
                            <td className="p-3">
                              <span className="font-bold text-red-700">
                                {loan.days_overdue} days
                              </span>
                            </td>
                            <td className="p-3">
                              <StatusBadge status={loan.status} />
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleReturnBook(loan.loan_id)}
                                disabled={returningLoanId === loan.loan_id}
                                className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
                              >
                                {returningLoanId === loan.loan_id
                                  ? "Returning..."
                                  : "Return"}
                              </button>
                            </td>
                          </tr>
                        ))}

                        {overdueLoans.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-500">
                              No overdue books at this time.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Overdue status is checked by the backend when this dashboard
                    loads or is refreshed.
                  </p>
                </section>
              </div>
            )}
          </>
        )}
      </section>

      <footer className="border-t border-slate-200 bg-white px-6 py-5 text-center text-xs text-slate-500">
        Library Book Demand & Recommendation Management System
      </footer>
    </main>
  );
}
