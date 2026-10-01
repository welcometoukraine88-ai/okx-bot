export const runtime = 'edge';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const bodyText = await req.text();
    console.log("1. Входящий алерт TradingView:", bodyText);

    const textUpper = bodyText.toUpperCase();

    // 1. Фильтр сигналов Wyckoff: Upthrust -> SHORT, Spring -> LONG
    let action = "";
    if (textUpper.includes("UPTHRUST")) {
      action = "ENTER_SHORT";
    } else if (textUpper.includes("SPRING")) {
      action = "ENTER_LONG";
    } else {
      console.log("Игнор: В тексте нет слов UPTHRUST или SPRING");
      return new Response("Ignored: Signal is not Upthrust or Spring", { status: 200 });
    }

    // 2. Извлечение тикера (например, "CRDOUSDT.P" -> "CRDO-USDT-SWAP")
    let instrument = "BTC-USDT-SWAP";
    const cleanedText = bodyText.replace(/^"/, '');
    const firstWord = cleanedText.split(/[\s:]+/)[0];

    if (firstWord) {
      const baseCoin = firstWord.toUpperCase()
        .replace(".P", "")
        .replace("PERP", "")
        .replace("USDT", "")
        .replace("-", "");

      if (baseCoin.length >= 2) {
        instrument = `${baseCoin}-USDT-SWAP`;
      }
    }

    // 3. Формирование точного JSON для OKX
    const payload = {
      action: action,
      instrument: instrument,
      signalToken: "Q85Vbjf/AF+keggcxeK5Nro2ohtegF5rXLBNAAYV/hJj4UJIfzhHYTs6gYH2Ft2uvHd0pQqltQKDNfBYZpYGmA==",
      timestamp: new Date().toISOString(),
      maxLag: "300",
      orderType: "market",
      orderPriceOffset: "",
      investmentType: "percentage_balance",
      amount: "2"
    };

    console.log("2. Отправка в OKX:", JSON.stringify(payload));

    // 4. Отправка на оригинальный шлюз OKX через Edge-сеть Vercel
    const okxResponse = await fetch("https://www.okx.com/algo/signal/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await okxResponse.text();
    console.log("3. Ответ от OKX:", okxResponse.status, responseText);

    return new Response(`OKX Status ${okxResponse.status}: ${responseText}`, { status: 200 });

  } catch (error) {
    console.error("Ошибка обработчика:", error);
    return new Response(`Error processing webhook: ${error.message}`, { status: 500 });
  }
}
