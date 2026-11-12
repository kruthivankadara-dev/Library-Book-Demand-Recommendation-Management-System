
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://localhost:5000/api";

type User = {
  userId: number;
  memberId: number;
  email: string;
  role: string;
};

type Book = {
  book_id: number;
  title: string;
  author: string;
  category: string;
  publication_year?: number;
  total_copies?: number;
  borrowed_copies: number;
  available_copies: number;
  availability_status: string;
};

type Loan = {
  loan_id: number;
  book_id: number;
  title: string;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: string;
};

type Reservation = {
  reservation_id: number;
  book_id: number;
  title: string;
  reservation_date: string;
  status: string;
  queue_position: number | null;
};

type Recommendation = {
  book_id: number;
  title: string;
  author: string;
  category: string;
  average_rating: number;
  score: number;
  reasons: string[];
};

type Section =
  | "overview"
  | "books"
  | "loans"
  | "reservations"
  | "recommendations";

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "â€”";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MemberDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [recommendations, setRecommendations] =
    useState<Recommendation[]>([]);

  const [activeSection, setActiveSection] =
    useState<Section>("overview");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reservingBookId, setReservingBookId] =
  useState<number | null>(null);

  const [cancellingReservationId, setCancellingReservationId] =
  useState<number | null>(null);

const [reservationMessage, setReservationMessage] =
  useState("");

const [reservationError, setReservationError] =
  useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const token = sessionStorage.getItem("memberToken");

        if (!token) {
          router.replace("/login");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const meResponse = await fetch(`${API}/auth/me`, {
          headers,
        });

        if (!meResponse.ok) {
          sessionStorage.removeItem("memberToken");
          sessionStorage.removeItem("memberUser");
          router.replace("/login");
          return;
        }

        const meData = await meResponse.json();
        const currentUser: User = meData.user;

        if (
          currentUser.role !== "MEMBER" ||
          !currentUser.memberId
        ) {
          sessionStorage.removeItem("memberToken");
          sessionStorage.removeItem("memberUser");
          router.replace("/login");
          return;
        }

        if (cancelled) return;

        setUser(currentUser);

        const memberId = currentUser.memberId;

        const [
          booksResponse,
          loansResponse,
          reservationsResponse,
          recommendationsResponse,
        ] = await Promise.all([
          fetch(`${API}/books`),
          fetch(`${API}/loans/member/${memberId}`, { headers }),
          fetch(`${API}/reservations/member/${memberId}`, {
            headers,
          }),
          fetch(`${API}/recommendations/${memberId}`, {
            headers,
          }),
        ]);

        if (!booksResponse.ok) {
          throw new Error("Unable to load the book catalogue.");
        }

        if (!loansResponse.ok) {
          throw new Error("Unable to load your loan history.");
        }

        if (!reservationsResponse.ok) {
          throw new Error("Unable to load your reservations.");
        }

        if (!recommendationsResponse.ok) {
          throw new Error("Unable to load recommendations.");
        }

        const [
          booksData,
          loansData,
          reservationsData,
          recommendationsData,
        ] = await Promise.all([
          booksResponse.json(),
          loansResponse.json(),
          reservationsResponse.json(),
          recommendationsResponse.json(),
        ]);

        if (cancelled) return;

        setBooks(booksData);
        setLoans(loansData);
        setReservations(reservationsData);
        setRecommendations(
          recommendationsData.recommendations || []
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your dashboard."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function logout() {
    sessionStorage.removeItem("memberToken");
    sessionStorage.removeItem("memberUser");
    router.replace("/login");
  }

  async function handleReserve(bookId: number) {
  const token = sessionStorage.getItem("memberToken");

  if (!token) {
    router.replace("/login");
    return;
  }

  setReservingBookId(bookId);
  setReservationMessage("");
  setReservationError("");

  try {
    const response = await fetch(`${API}/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        book_id: bookId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to reserve this book."
      );
    }

    setReservationMessage(
      data.message || "Reservation created successfully."
    );

    const reservationsResponse = await fetch(
      `${API}/reservations/member/${user?.memberId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!reservationsResponse.ok) {
      throw new Error(
        "Reservation created, but the reservation list could not refresh."
      );
    }

    const updatedReservations =
      await reservationsResponse.json();

    setReservations(updatedReservations);
  } catch (err) {
    setReservationError(
      err instanceof Error
        ? err.message
        : "Reservation failed."
    );
  } finally {
    setReservingBookId(null);
  }
}


async function handleCancelReservation(reservationId: number) {
  const token = sessionStorage.getItem("memberToken");

  if (!token) {
    router.replace("/login");
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to cancel this reservation?"
  );

  if (!confirmed) return;

  setCancellingReservationId(reservationId);
  setReservationMessage("");
  setReservationError("");

  try {
    const response = await fetch(
      `${API}/reservations/${reservationId}/cancel`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || data.error || "Unable to cancel reservation."
      );
    }

    setReservationMessage(
      data.message || "Reservation cancelled successfully."
    );

    // Refresh reservations to update FIFO queue positions
    const reservationsResponse = await fetch(
      `${API}/reservations/member/${user?.memberId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!reservationsResponse.ok) {
      throw new Error(
        "Reservation cancelled, but the list could not refresh. Please reload."
      );
    }

    const updatedReservations = await reservationsResponse.json();
    setReservations(updatedReservations);

  } catch (err) {
    setReservationError(
      err instanceof Error
        ? err.message
        : "Reservation cancellation failed."
    );
  } finally {
    setCancellingReservationId(null);
  }
}


  const activeLoans = loans.filter(
    (loan) =>
      loan.status?.toLowerCase() === "borrowed" ||
      loan.status?.toLowerCase() === "overdue"
  );

  const activeReservations = reservations.filter(
    (reservation) =>
      reservation.status?.toLowerCase() === "active"
  );

  const overdueLoans = loans.filter(
    (loan) => loan.status?.toLowerCase() === "overdue"
  );

  const filteredBooks = books.filter((book) =>
    `${book.title} ${book.author} ${book.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const navItems: { id: Section; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "books", label: "Book Catalogue" },
    { id: "loans", label: "My Loans" },
    { id: "reservations", label: "Reservations" },
    { id: "recommendations", label: "Recommendations" },
  ];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-lg font-semibold text-slate-700">
          Loading your library dashboard...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">
            Unable to load dashboard
          </h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
          <button
            onClick={logout}
            className="mt-6 rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 px-6 py-7 text-white md:px-12">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
              Library Intelligence
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              Member Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Discover books. Manage your reading. Explore recommendations.
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-slate-600 px-5 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-10">
        <div className="mb-7">
          <p className="text-sm text-slate-500">
            Welcome back,
          </p>
          <h2 className="text-2xl font-bold">
            {user?.email}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Member ID: {user?.memberId}
          </p>
        </div>

        <nav className="mb-8 flex flex-wrap gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeSection === item.id
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {activeSection === "overview" && (
          <section>
            <h2 className="mb-5 text-xl font-bold">
              Your Library Overview
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Total Books",
                  value: books.length,
                },
                {
                  label: "Currently Borrowed",
                  value: activeLoans.length,
                },
                {
                  label: "Active Reservations",
                  value: activeReservations.length,
                },
                {
                  label: "Overdue Books",
                  value: overdueLoans.length,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold">
                  Current Loans
                </h3>

                {activeLoans.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    You have no active loans.
                  </p>
                ) : (
                  activeLoans.slice(0, 5).map((loan) => (
                    <div
                      key={loan.loan_id}
                      className="border-b border-slate-100 py-3 last:border-0"
                    >
                      <p className="font-semibold">{loan.title}</p>
                      <p className="text-sm text-slate-500">
                        Due: {formatDate(loan.due_date)} Â· {loan.status}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold">
                  Active Reservations
                </h3>

                {activeReservations.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    You have no active reservations.
                  </p>
                ) : (
                  activeReservations.slice(0, 5).map((reservation) => (
                    <div
                      key={reservation.reservation_id}
                      className="border-b border-slate-100 py-3 last:border-0"
                    >
                      <p className="font-semibold">
                        {reservation.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        Queue position: {reservation.queue_position ?? "â€”"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeSection === "books" && (
          <section>
            <h2 className="mb-5 text-xl font-bold">
              Explore the Book Catalogue
            </h2>

             {/* Reservation success message */}
    {reservationMessage && (
      <p className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-800">
        {reservationMessage}
      </p>
    )}

    {/* Reservation error message */}
    {reservationError && (
      <p className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">
        {reservationError}
      </p>
    )}

    <input
      type="search"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search by title, author or category..."
      className="mb-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-cyan-600"
    />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBooks.map((book) => (
                <div
                  key={book.book_id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase text-cyan-700">
                    {book.category}
                  </p>
                  <h3 className="mt-2 text-lg font-bold">
                    {book.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    By {book.author}
                  </p>

                  <div className="mt-4 space-y-2 text-sm">
  <p>
    Total copies: <strong>{book.total_copies}</strong>
  </p>

  <p>
    Borrowed copies: <strong>{book.borrowed_copies}</strong>
  </p>

  <p>
    Available copies: <strong>{book.available_copies}</strong>
  </p>

  <span
    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
      book.available_copies > 0
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700"
    }`}
  >
    {book.available_copies > 0
      ? "Available"
      : "Currently Unavailable"}
  </span>


{(() => {
  const activeReservation = reservations.find(
    (reservation) =>
      Number(reservation.book_id) === Number(book.book_id) &&
      reservation.status?.toLowerCase() === "active"
  );

  if (activeReservation) {
    return (
      <div className="mt-3 rounded-xl bg-cyan-50 p-3">
        <p className="font-semibold text-cyan-800">
          Reservation Active
        </p>
        <p className="mt-1 text-sm text-cyan-700">
          Queue Position: {activeReservation.queue_position ?? "Pending"}
        </p>
      </div>
    );
  }

  if (book.available_copies === 0) {
    return (
      <button
        onClick={() => handleReserve(book.book_id)}
        disabled={reservingBookId === book.book_id}
        className="mt-3 w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {reservingBookId === book.book_id
          ? "Reserving..."
          : "Join Reservation Queue"}
      </button>
    );
  }

  return null;
})()}

</div>
                </div>
              ))}

              {filteredBooks.length === 0 && (
                <p className="text-sm text-slate-500">
                  No matching books found.
                </p>
              )}
            </div>
          </section>
        )}

        {activeSection === "loans" && (
          <section>
            <h2 className="mb-5 text-xl font-bold">
              My Borrowing History
            </h2>

            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-200">
                  <tr>
                    <th className="p-4">Book</th>
                    <th className="p-4">Issue Date</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Return Date</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.loan_id} className="border-t">
                      <td className="p-4 font-semibold">{loan.title}</td>
                      <td className="p-4">{formatDate(loan.issue_date)}</td>

<td className="p-4">{formatDate(loan.due_date)}</td>

<td className="p-4">
  {formatDate(loan.return_date)}
</td>
                      <td className="p-4">{loan.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loans.length === 0 && (
                <p className="p-6 text-slate-500">
                  No loan records found.
                </p>
              )}
            </div>
          </section>
        )}

        {activeSection === "reservations" && (
          <section>
            <h2 className="mb-5 text-xl font-bold">
              My Reservations
            </h2>


            {reservationMessage && (
  <p className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-800">
    {reservationMessage}
  </p>
)}

{reservationError && (
  <p className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">
    {reservationError}
  </p>
)}

            <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-200">
                  <tr>
                    <th className="p-4">Book</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Queue Position</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr
                      key={reservation.reservation_id}
                      className="border-t"
                    >
                      <td className="p-4 font-semibold">
                        {reservation.title}
                      </td>
                      <td className="p-4">
  {formatDate(reservation.reservation_date)}
</td>
                      <td className="p-4">
                        {reservation.status === "Active"
                          ? reservation.queue_position ?? "â€”"
                          : "â€”"}
                      </td>
                      <td className="p-4">
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold ${
      reservation.status === "Active"
        ? "bg-green-100 text-green-700"
        : reservation.status === "Fulfilled"
        ? "bg-blue-100 text-blue-700"
        : reservation.status === "Cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-700"
    }`}
  >
    {reservation.status}
  </span>
</td>

<td className="p-4">
  {reservation.status === "Active" ? (
    <button
      onClick={() =>
        handleCancelReservation(reservation.reservation_id)
      }
      disabled={
        cancellingReservationId === reservation.reservation_id
      }
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {cancellingReservationId === reservation.reservation_id
        ? "Cancelling..."
        : "Cancel"}
    </button>
  ) : (
    <span className="text-slate-400">â€”</span>
  )}
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reservations.length === 0 && (
                <p className="p-6 text-slate-500">
                  No reservation records found.
                </p>
              )}
            </div>
          </section>
        )}

        {activeSection === "recommendations" && (
          <section>
            <h2 className="mb-5 text-xl font-bold">
              Recommended For You
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((book) => (
                <div
                  key={book.book_id}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase text-cyan-700">
                    {book.category}
                  </p>
                  <h3 className="mt-2 text-lg font-bold">
                    {book.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    By {book.author}
                  </p>
                  <p className="mt-3 text-sm">
                    Average rating: {book.average_rating || "Not rated"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-cyan-700">
                    Recommendation score: {(book.score * 100).toFixed(1)}%
                  </p>
                  <ul className="mt-3 list-inside list-disc text-sm text-slate-500">
                    {book.reasons?.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}

              {recommendations.length === 0 && (
                <p className="text-sm text-slate-500">
                  No recommendations available yet.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
