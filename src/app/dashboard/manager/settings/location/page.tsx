"use client";

import { useQuery, useMutation } from "@apollo/client";
import { GET_LOCATION } from "@utils/queries";
import { useState, useRef, useEffect } from "react";
import { Input, Button, Alert, Space, notification, Typography } from "antd";
import { EditOutlined, SearchOutlined } from "@ant-design/icons";
import { useLoadScript, Libraries } from "@react-google-maps/api";
import type { InputRef, NotificationArgsProps } from "antd";
import { CREATE_LOCATION, UPDATE_LOCATION } from "@utils/mutations";
import { Location } from "@prisma/client";

const libraries: Libraries = ["places", "geocoding"];
type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";
const { Text } = Typography;

export default function LocationPage() {
  const { data, loading, error } = useQuery(GET_LOCATION);
  const [createLocation] = useMutation(CREATE_LOCATION);
  const [updateLocation] = useMutation(UPDATE_LOCATION);
  const [isEditing, setIsEditing] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");
  const searchInputRef = useRef<InputRef>(null);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [radius, setRadius] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [errors, setErrors] = useState({
    searchLocation: "",
    radius: "",
  });
  const [location, setLocation] = useState<Location | null>(null);

  const [notificationConfig, setNotificationConfig] = useState<{
    message: string;
    description: string;
    placement: NotificationPlacement;
    type: NotificationType;
    autoCloseDuration: number;
  } | null>(null);

  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    if (notificationConfig) {
      const { message, description, placement, type, autoCloseDuration } =
        notificationConfig;
      api[type]({
        message,
        description,
        placement,
        duration: autoCloseDuration,
      });
      setNotificationConfig(null); // Reset notification config after showing the notification
    }
  }, [notificationConfig, api]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key is missing.");
  }

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    if (!loading && data?.location) {
      setLocation(data.location);
      setLatitude(data.location.latitude);
      setLongitude(data.location.longitude);
      setRadius(data.location.radius);
      setSearchLocation(data.location.name);
    }
  }, [loading, data]);

  const handleSearch = () => {
    if (isLoaded && searchInputRef.current?.input) {
      console.log("Google Maps API has loaded");
      const inputElement = searchInputRef.current.input;
      const autocomplete = new google.maps.places.Autocomplete(inputElement, {
        types: ["geocode"],
        componentRestrictions: { country: ["us", "in", "gb"] },
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();

        if (!place?.geometry?.location) {
          console.error("Invalid place object:", place);
          return;
        }

        console.log("Place object:", place);

        setLatitude(place.geometry.location.lat());
        setLongitude(place.geometry.location.lng());

        if (!place.formatted_address) {
          console.error("Invalid place object:", place);
          return;
        }

        setSearchLocation(place.formatted_address);
      });
    } else if (loadError) {
      console.error("Error loading Google Maps API:", loadError);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const validateRadius = (radius: number) => {
    if (radius < 1) {
      return "Radius must be at least 1 meter.";
    }
    return "";
  };

  const validateSearchLocation = (searchLocation: string) => {
    if (searchLocation.trim() === "") {
      return "Location is required.";
    }
    return "";
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const radiusValue = parseFloat(e.target.value);
    setRadius(radiusValue);
    setErrors((prevErrors) => ({
      ...prevErrors,
      radius: validateRadius(radiusValue),
    }));
  };

  const handleSaveLocation = async () => {
    const searchLocationError = validateSearchLocation(searchLocation);
    const radiusError = validateRadius(radius);

    setErrors({
      searchLocation: searchLocationError,
      radius: radiusError,
    });

    if (!searchLocationError && !radiusError) {
      if (latitude === 0 || longitude === 0) {
        // Show snackbar error with try again later message
        setNotificationConfig({
          message: "Invalid Location",
          description: "Please try again later.",
          placement: "topRight",
          type: "error",
          autoCloseDuration: 3,
        });
        console.error("Invalid latitude or longitude:", latitude, longitude);
        return;
      }

      try {
        const response = await createLocation({
          variables: {
            input: {
              name: searchLocation,
              latitude,
              longitude,
              radius,
            },
          },
        });
        setNotificationConfig({
          message: "Location Saved",
          description: "Location has been saved successfully.",
          placement: "topRight",
          type: "success",
          autoCloseDuration: 3,
        });
        console.log("Location saved:", response.data.createLocation);
        // update the local state with the new location & setLocation to true
        setLocation(response.data.createLocation);
      } catch (error) {
        setNotificationConfig({
          message: "Error Saving Location",
          description: "An error occurred while saving location.",
          placement: "topRight",
          type: "error",
          autoCloseDuration: 3,
        });
        console.error("Error saving location:", error);
      }
      console.log({ latitude, longitude, radius });
      setIsEditing(false);
      setSearchLocation("");
      setLatitude(0);
      setLongitude(0);
      setRadius(0);
      setErrors({
        searchLocation: "",
        radius: "",
      });
    }
  };

  const handleUpdateLocation = async () => {
    const searchLocationError = validateSearchLocation(searchLocation);
    const radiusError = validateRadius(radius);

    setErrors({
      searchLocation: searchLocationError,
      radius: radiusError,
    });

    if (!searchLocationError && !radiusError) {
      if (latitude === 0 || longitude === 0) {
        // Show snackbar error with try again later message
        setNotificationConfig({
          message: "Invalid Location",
          description: "Please try again later.",
          placement: "topRight",
          type: "error",
          autoCloseDuration: 3,
        });
        console.error("Invalid latitude or longitude:", latitude, longitude);
        return;
      }

      try {
        const response = await updateLocation({
          variables: {
            input: {
              name: searchLocation,
              latitude,
              longitude,
              radius,
            },
          },
        });
        setNotificationConfig({
          message: "Location Updated",
          description: "Location has been updated successfully.",
          placement: "topRight",
          type: "success",
          autoCloseDuration: 3,
        });
        console.log("Location updated:", response.data.updateLocation);
        // update the local state with the new location & setLocation to true
        setLocation(response.data.updateLocation);
      } catch (error) {
        setNotificationConfig({
          message: "Error Updating Location",
          description: "An error occurred while updating location.",
          placement: "topRight",
          type: "error",
          autoCloseDuration: 3,
        });
        console.error("Error updating location:", error);
      }
      console.log({ latitude, longitude, radius });
      setIsEditing(false);
      setSearchLocation("");
      setLatitude(0);
      setLongitude(0);
      setRadius(0);
      setErrors({
        searchLocation: "",
        radius: "",
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSearchLocation("");
    setLatitude(0);
    setLongitude(0);
    setRadius(0);
    setErrors({
      searchLocation: "",
      radius: "",
    });
  };

  const renderLongerLocationName = () => {
    if (location?.name) {
      if (location.name.length > 40) {
        if (!expanded) {
          return (
            <>
              {location.name.slice(0, 40)}...
              <Button
                type="link"
                onClick={() => {
                  setExpanded(true);
                }}
              >
                more
              </Button>
            </>
          );
        } else {
          return (
            <>
              {location.name}
              <Button
                type="link"
                onClick={() => {
                  setExpanded(false);
                }}
              >
                less
              </Button>
            </>
          );
        }
      } else {
        return location.name;
      }
    } else return null;
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <Space direction="vertical" size={["large", "large"]}>
          <Space direction="horizontal" align="start">
            <Space direction="vertical">
              <label htmlFor="searchLocation">Search Location</label>
              <Input
                ref={searchInputRef}
                placeholder="Search location"
                maxLength={200}
                name="searchLocation"
                prefix={<SearchOutlined />}
                onFocus={handleSearch}
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              />
            </Space>
            <Space direction="vertical">
              <label htmlFor="radius">Radius (Km.)</label>
              <Input
                type="number"
                name="radius"
                placeholder="Enter radius in Kms."
                value={radius}
                onChange={handleRadiusChange}
              />
              {errors.radius && (
                <span style={{ color: "red" }}>{errors.radius}</span>
              )}
            </Space>
          </Space>
          <Space direction="horizontal">
            <Button
              type="primary"
              onClick={location ? handleUpdateLocation : handleSaveLocation}
            >
              {location ? "Update" : "Save"}
            </Button>
            <Button onClick={handleCancel}>Cancel</Button>
          </Space>
        </Space>
      );
    } else if (location) {
      return (
        <Space direction="vertical" size={["small", "large"]}>
          <div>
            <div>
              <Text strong>Location: </Text>
              <span>{renderLongerLocationName()}</span>
            </div>
            <div>
              <span>
                <Text strong>Radius:</Text> {location.radius} Kmts.
              </span>
            </div>
          </div>
          <Button
            type="primary"
            onClick={() => {
              setLatitude(location.latitude);
              setLongitude(location.longitude);
              setRadius(location.radius);
              setSearchLocation(location.name);
              setIsEditing(true);
            }}
          >
            <EditOutlined /> Edit
          </Button>
        </Space>
      );
    } else {
      return null;
    }
  };

  return (
    <div>
      {contextHolder}
      {!location && !isEditing ? (
        <Alert
          message="Location Setup Required"
          description="Please set up the location and perimeter for staff clock-in."
          type="warning"
          showIcon
          action={
            <Button type="primary" onClick={() => setIsEditing(true)}>
              Set Up Location
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      ) : (
        renderContent()
      )}
    </div>
  );
}
