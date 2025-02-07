import type { UserGeolocation } from "../types"

interface FreeGeoIp {
  ip: string
  country_code: string
  country_name: string
  region_code: string
  region_name: string
  city: string
  zip_code: string
  time_zone: string
  latitude: number
  longitude: number
  metro_code: number
}

/**
 * Returns a display location string
 * @param locationData - user location info
 */
export const getUserGeolocationName = (
  locationData: UserGeolocation,
): string => {
  const { city, countryName } = locationData
  const out = [countryName]

  if (city) {
    out.unshift(city)
  }

  return out.filter(Boolean).join(", ")
}

/**
 * Get IP address on network
 */
export const getNetworkIp = async (): Promise<string> => {
  const stream = await fetch("https://www.cloudflare.com/cdn-cgi/trace")

  const data = await stream.text()

  const rawText = data.split(`\n`).find((_: string) => _.includes("ip="))

  const ip = rawText?.split("=").pop() ?? ""

  return ip
}

/**
 * Gets user location data based on their IP
 * @reference
 * https://freegeoip.app/
 */
export const setUserGeolocation = async (): Promise<UserGeolocation | void> => {
  /**
   * Cache the value in case run multiple times
   * Don't get information on server as it will return server information not user
   */

  if (typeof sessionStorage !== "undefined") {
    const r = sessionStorage.getItem("KGeo")
    if (r) {
      return JSON.parse(r) as UserGeolocation
    }
  } else if (typeof window == "undefined") {
    return
  }

  let data: FreeGeoIp

  try {
    const r = await fetch("https://freegeoip.app/json/")

    data = (await r.json()) as FreeGeoIp
  } catch {
    // eslint-disable-next-line no-console
    console.warn("Unable to get geo data.")
    return
  }

  const {
    ip,
    country_code,
    country_name,
    region_code,
    region_name,
    city,
    zip_code,
    time_zone,
    latitude,
    longitude,
    metro_code,
  } = data

  const geo: UserGeolocation = {
    ip: ip,
    countryCode: country_code,
    countryName: country_name,
    regionCode: region_code,
    regionName: region_name,
    city: city,
    zip: zip_code,
    timeZone: time_zone,
    latitude,
    longitude,
    metroCode: metro_code,
  }

  geo.name = getUserGeolocationName(geo)

  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("geo", JSON.stringify(geo))
  }

  return geo
}
