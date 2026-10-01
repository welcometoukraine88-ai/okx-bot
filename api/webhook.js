export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const textUpper = bodyText.toUpperCase();

    // 1. Фильтр сигналов Wyckoff: Upthrust -> SHORT, Spring -> LONG
    let action = "";
    if (textUpper.includes("UPTHRUST")) {
      action = "ENTER_SHORT";
    } else if (textUpper.includes("SPRING")) {
      action = "ENTER_LONG";
    } else {
      return res.status(200).send("Ignored: Signal is not Upthrust or Spring");
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
      timestamp: Date.now().toString(),
      maxLag: "300",
      orderType: "market",
      orderPriceOffset: "",
      investmentType: "percentage_balance",
      amount: "2"
    };

    // 4. Отправка ордера на OKX с заголовком User-Agent (обход блокировки OKX)
    const okxResponse = await fetch("https://www.okx.com/algo/signal/trigger", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await okxResponse.text();
    
    // Всегда возвращаем 200 OK в TradingView, чтобы видеть ответ от OKX в логах
    return res.status(200).send(`OKX Status ${okxResponse.status}: ${responseText}`);

  } catch (error) {
    return res.status(500).send(`Error processing webhook: ${error.message}`);
  }
}
