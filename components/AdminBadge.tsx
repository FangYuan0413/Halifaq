// Small tag shown next to an admin's name wherever it appears (sidebar,
// profile header, post/reply author bylines) so their moderation authority
// is visible to everyone, not just to them.
export default function AdminBadge() {
  return (
    <span className="rounded-full bg-cyan-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-300">
      Admin
    </span>
  );
}
