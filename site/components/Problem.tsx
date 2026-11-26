/** A day as one line: a run of counted hours inside an otherwise ordinary day. */
const DOTS = 48;
const COUNTED_FROM = 14;
const COUNTED_TO = 22;

export function DayLine() {
  return (
    <div className="dayline" aria-hidden="true">
      {Array.from({ length: DOTS }, (_, i) => (
        <i key={i} className={i >= COUNTED_FROM && i < COUNTED_TO ? "on" : undefined} />
      ))}
    </div>
  );
}

export function Problem() {
  return (
    <section className="problem">
      <div className="container">
        <div className="problem-grid">
          <h2>Your screen is on longer than you are.</h2>
          <p>
            A computer counts from the moment you log in until you shut down. That number is
            easy to look at and hard to trust. Serion counts the time you are actually there,
            and takes back the minutes you spent away.
          </p>
        </div>
        <DayLine />
      </div>
    </section>
  );
}
