import Fastify from "fastify";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const fastify = Fastify();

fastify.get("/", (request, reply) => {
  return "Hello";
});

const airlineCodes = [
  "2A",
  "3L",
  "3U",
  "6E",
  "8D",
  "8M",
  "A3",
  "AA",
  "AC",
  "AF",
  "AI",
  "AS",
  "AT",
  "AV",
  "AY",
  "AZ",
  "B6",
  "BA",
  "BG",
  "BI",
  "BR",
  "BS",
  "CA",
  "CI",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DL",
  "EI",
  "EK",
  "ES",
  "ET",
  "EY",
  "FI",
  "FM",
  "FZ",
  "G9",
  "GA",
  "GF",
  "H1",
  "H9",
  "HX",
  "IB",
  "J2",
  "J9",
  "JL",
  "KE",
  "KL",
  "KQ",
  "KU",
  "LH",
  "LJ",
  "LM",
  "LO",
  "LX",
  "LY",
  "ME",
  "MH",
  "MS",
  "MU",
  "NH",
  "OD",
  "OS",
  "OV",
  "OZ",
  "PG",
  "PR",
  "QF",
  "QR",
  "RJ",
  "RO",
  "RQ",
  "SA",
  "SK",
  "SL",
  "SN",
  "SQ",
  "SV",
  "TG",
  "TK",
  "TP",
  "TR",
  "UA",
  "UG",
  "UI",
  "UL",
  "UM",
  "UN",
  "UO",
  "UP",
  "UT",
  "UU",
  "UX",
  "UZ",
  "VF",
  "VJ",
  "VN",
  "VQ",
  "VS",
  "VT",
  "VU",
  "VY",
  "W3",
  "W5",
  "WA",
  "WB",
  "WF",
  "WI",
  "WK",
  "WM",
  "WN",
  "WO",
  "WS",
  "WT",
  "WU",
  "WY",
  "X3",
  "X5",
  "XE",
  "XF",
  "XJ",
  "XK",
  "XL",
  "XM",
  "XY",
  "XZ",
  "Y4",
  "Y5",
  "YD",
  "YI",
  "YW",
  "Z2",
  "ZG",
  "ZH",
  "ZL",
  "ZN",
  "ZV",
  "ZX",
  "ZY",
];

const airportCache = new Map();

async function getAirportName(iata) {
  try {
    const response = await axios.get(`https://api.sharetrip.net/api/v1/flight/search/airport?name=${iata}`);
    const data = response.data?.response?.[0];
    return data?.name || iata;
  } catch (err) {
    console.error(`Failed to fetch airport name for ${iata}`, err.message);
    return iata;
  }
}

function getCachedAirportName(iata) {
  if (!airportCache.has(iata)) {
    const fetchPromise = getAirportName(iata).then((name) => {
      return name;
    });
    airportCache.set(iata, fetchPromise);
  }

  return airportCache.get(iata);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateFlightLeg(origin, destination, airlineCode, flightNum, date, reverse = false) {
  const depHour = getRandomInt(6, 22);
  const durationHours = getRandomInt(4, 7);
  const durationMins = getRandomInt(0, 59);
  const depTime = new Date(`${date}T${String(depHour).padStart(2, "0")}:00:00Z`);
  const arrTime = new Date(depTime.getTime() + durationHours * 60 * 60 * 1000 + durationMins * 60 * 1000);

  const originName = await getCachedAirportName(reverse ? destination : origin);
  const destinationName = await getCachedAirportName(reverse ? origin : destination);

  return {
    originAirportName: originName,
    destinationAirportName: destinationName,
    layoverTime: null,
    marketingCarrierCode: airlineCode,
    marketingCarrierName: `Airline ${airlineCode}`,
    flightNumber: `${flightNum}`,
    originCode: reverse ? destination : origin,
    destinationCode: reverse ? origin : destination,
    departureTime: depTime.toISOString(),
    arrivalTime: arrTime.toISOString(),
    duration: `${durationHours}h ${durationMins}m`,
    operatingCarrierCode: airlineCode,
    operatingCarrierName: null,
    operatingFlightNumber: `${flightNum}`,
    originTerminal: "Terminal 1",
    destinationTerminal: "Terminal 2",
    bookingClass: "O",
    bookingAvailability: "9",
    cabinClass: "ECONOMY",
    baggageAllowance: "20kg",
    aircraftType: "73H",
    baggageDetails: [],
  };
}

function generateFare(request) {
  const baseFare = getRandomInt(600, 1000);
  const tax = getRandomInt(100, 200);
  const discount = getRandomInt(0, 100);
  const total = baseFare + tax - discount;
  return {
    discountAmount: discount,
    markupFee: 0,
    serviceFee: 0,
    passengerType: "ADT",
    totalFare: total,
    passengerCount: request.NoOfAdult,
    baseFare: baseFare,
    taxAmount: tax,
    ait: 3,
  };
}

async function generateFlightSearchResult(request, airlineCode, flightIdx) {
  const onwardFlight = await generateFlightLeg(
    request.Origin,
    request.Destination,
    airlineCode,
    `${airlineCode}${flightIdx + 100}`,
    request.DepartureDate
  );

  const returnFlight = request.ReturnDate
    ? await generateFlightLeg(
        request.Origin,
        request.Destination,
        airlineCode,
        `${airlineCode}${flightIdx + 200}`,
        request.ReturnDate,
        true
      )
    : null;

  const fare = generateFare(request);

  return {
    journeyDurations: [
      {
        layoverDuration: "0",
        totalDuration: onwardFlight.duration,
        stopCount: 0,
      },
      ...(returnFlight
        ? [
            {
              layoverDuration: "0",
              totalDuration: returnFlight.duration,
              stopCount: 0,
            },
          ]
        : []),
    ],
    fareDetails: [fare],
    onwardFlights: [onwardFlight],
    returnFlights: returnFlight ? [returnFlight] : [],
    totalDiscount: fare.discountAmount,
    totalAit: fare.ait,
    totalMarkup: 0,
    totalPrice: fare.totalFare,
    baseFare: fare.baseFare,
    ait: 0,
    currency: "BDT",
    adultCount: request.NoOfAdult,
    childCount: request.NoOfChildren,
    infantCount: request.NoOfInfant,
    isRefundable: false,
    isBookable: true,
    totalTax: fare.taxAmount,
    fareType: "Regular",
    tripType: request.ReturnDate ? "RoundTrip" : "OneWay",
    segmentCode: uuidv4(),
    internalRefId: `IGG-${uuidv4().slice(0, 8)}`,
    providerKey: `PROVIDER-${uuidv4().slice(0, 8)}`,
  };
}

fastify.post("/getFlight", async (request) => {
  const requestBody = request.body;
  const promises = [];

  for (const airlineCode of airlineCodes) {
    for (let i = 0; i < 2; i++) {
      promises.push(generateFlightSearchResult(requestBody, airlineCode, i));
    }
  }

  return await Promise.all(promises);
});

try {
  await fastify.listen({ port: 8001 });
  console.log("Fastify data source is running or port: 8001");
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
