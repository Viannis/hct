import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { initializeApolloClient } from "@utils/apolloClient";
import { GET_LOCATION } from "@utils/queries";
import { Location } from "@prisma/client";

interface UserLocation {
  latitude: number;
  longitude: number;
}

const isWithinRange = ({
  absLat,
  absLong,
  absRadius,
  userLat,
  userLong,
}: {
  absLat: number;
  absLong: number;
  absRadius: number;
  userLat: number;
  userLong: number;
}) => {
  const R = 6371; // Radius of the Earth in Kms.
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(userLat - absLat);
  const dLon = toRad(userLong - absLong);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(absLat)) *
      Math.cos(toRad(userLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // distance in Kms.

  console.log("Distance", distance);
  console.log("Radius", absRadius);

  return distance <= absRadius;
};

export async function GET(req: NextRequest) {
  const latitude = req.nextUrl.searchParams.get("latitude");
  const longitude = req.nextUrl.searchParams.get("longitude");

  if (!latitude || !longitude) {
    return NextResponse.json(
      { message: "User location not found", userLocationMissing: true },
      { status: 400 }
    );
  }

  const userLocation: UserLocation = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
  };

  const res = NextResponse.next();
  const session = await getSession(req, res);

  if (!userLocation) {
    return NextResponse.json(
      { message: "User location not found", userLocationMissing: true },
      { status: 400 }
    );
  }

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const idToken = session.idToken;
  if (!idToken) {
    return NextResponse.json(
      { message: "Error fetching access token" },
      { status: 500 }
    );
  }

  const apolloClient = initializeApolloClient(idToken);

  const { data, error: locationDataError } = await apolloClient.query({
    query: GET_LOCATION,
  });

  const locationData: Location | null = data?.location || null;

  if (locationDataError) {
    return NextResponse.json(
      { message: "Error fetching location data" },
      { status: 500 }
    );
  }

  if (!locationData) {
    return NextResponse.json(
      { message: "Location data not found", locationNotFound: true },
      { status: 404 }
    );
  }

  const isUserInRange = isWithinRange({
    absLat: locationData.latitude,
    absLong: locationData.longitude,
    absRadius: locationData.radius,
    userLat: userLocation.latitude,
    userLong: userLocation.longitude,
  });

  return NextResponse.json(
    {
      message: `User is ${!isUserInRange ? "not" : ""} in range`,
      isUserInRange: isUserInRange,
    },
    { status: 200 }
  );
}
