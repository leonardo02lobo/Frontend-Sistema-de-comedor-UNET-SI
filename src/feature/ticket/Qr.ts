import QRCode from "qrcode";

const storedQr = sessionStorage.getItem("ticketQrPayload");
const storedTicket = sessionStorage.getItem("ticketData");
const fallbackPayload = storedTicket ? storedTicket : "";
const payload = storedQr || fallbackPayload;

const mostrarQR = async (data: string) => {
    const canvas = document.getElementById("qr") as HTMLCanvasElement;

    try {
        await QRCode.toCanvas(canvas, data, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        const payloadTextEl = document.getElementById("qr-payload-text");
        if (payloadTextEl) {
            payloadTextEl.textContent = data;
        }
        console.log("¡QR generado con éxito!");
    } catch (err) {
        console.error("Error generando el QR:", err);
    }
};

if (payload) {
    mostrarQR(payload);
}