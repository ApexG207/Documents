export default function RevenueSharing() {
  return (
    <main className="privacy">
      <header>
        <p>MATIQ COMMERCE</p>
        <h1>Community Revenue Sharing Terms</h1>
        <span>The governing 90% / 2% / 8% allocation for eligible net platform revenue.</span>
      </header>
      <section>
        <h2>Allocation basis</h2>
        <p>
          After refunds, chargebacks, taxes, payment-processing fees, and other approved transaction
          adjustments, 90% of eligible net platform revenue is allocated to operations and 10% to
          the community revenue-sharing allocation. Within total eligible net revenue, 2% is
          allocated as the founder distribution and 8% forms the academy-owner pool.
        </p>
        <h2>Equal academy allocation</h2>
        <p>
          After the applicable reserve period, the academy-owner pool is divided equally among
          academies that are verified, in good standing, payout-capable through Stripe, and eligible
          under the controlling monthly cohort rules. An academy receives one equal share per
          eligible period regardless of athlete count or revenue attribution unless a future written
          amendment states otherwise.
        </p>
        <h2>Reserve and adjustments</h2>
        <p>
          Community allocations are held for a 60-day reserve to account for refunds, disputes,
          reversals, fraud, tax corrections, and processing adjustments. Negative adjustments may
          reduce an unreleased cohort or a later distribution. No payout occurs until Stripe
          capability and identity requirements are active.
        </p>
        <h2>No ownership or guaranteed return</h2>
        <p>
          Participation does not create equity, voting rights, partnership, employment, a bank
          deposit, or an investment product. Future revenue and distributions are not guaranteed.
          MatIQ may pause a distribution for legal, compliance, safety, fraud, sanctions, tax, or
          account-verification reasons.
        </p>
        <h2>Records and changes</h2>
        <p>
          MatIQ maintains cohort, allocation, adjustment, and transfer records. Material prospective
          changes require notice. Changes do not retroactively alter a closed and released cohort
          except to correct error, fraud, reversal, or legal requirement.
        </p>
        <p>
          <b>Illustration:</b> For $10,000 of eligible net revenue, $9,000 supports operations, $200
          is the founder distribution, and $800 enters the eligible academy-owner pool.
        </p>
      </section>
    </main>
  );
}
