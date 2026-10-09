function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

async function loadExpiryAlerts() {
    const tbody = document.getElementById("expiryAlertsList");

    tbody.innerHTML =
        '<tr><td colspan="4">Loading expiry alerts...</td></tr>';

    try {
        const response = await fetch("/expiry-alerts");
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to load expiry alerts");
        }

        if (!data.alerts.length) {
            tbody.innerHTML =
                '<tr><td colspan="4">No expired or soon-to-expire stock found.</td></tr>';
            return;
        }

        tbody.innerHTML = data.alerts.map(item => {
            const days = Number(item.days_remaining);
            const expired = days < 0;
            const status = expired
                ? "EXPIRED"
                : days === 0
                    ? "EXPIRES TODAY"
                    : "EXPIRING SOON";

            const expiryDate = new Date(item.expiry_date)
                .toLocaleDateString();

            return `
                <tr>
                    <td>${safeText(item.product_name)}</td>
                    <td>${Number(item.remaining_quantity)}</td>
                    <td>${safeText(expiryDate)}</td>
                    <td>${status}</td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        console.error(error);
        tbody.innerHTML =
            '<tr><td colspan="4">Failed to load expiry alerts. Please refresh.</td></tr>';
    }
}

document.addEventListener("DOMContentLoaded", loadExpiryAlerts);