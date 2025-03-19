"use client";

import { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useQuery, useMutation } from "@apollo/client";
import { GET_USER } from "@utils/queries";
import { UPDATE_USER_PROFILE } from "@utils/mutations";
import { Input, Button, Typography, Spin, Alert, notification } from "antd";
import { EditOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function SettingsPage() {
  const { user, isLoading: userLoading, error: userError } = useUser();
  const {
    data,
    loading: queryLoading,
    error: queryError,
  } = useQuery(GET_USER, {
    variables: { userId: user?.sub },
    skip: !user,
  }); // Get the user data from the database

  const [updateUserProfile, { loading: mutationLoading }] =
    useMutation(UPDATE_USER_PROFILE); // Update the user profile mutation

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState({
    empty: false,
    hasNumbers: false,
    tooLong: false,
  });

  useEffect(() => {
    if (data?.user) {
      setName(data.user.name);
    }
  }, [data]); // Set the name to the user's name

  if (userLoading || queryLoading) return <Spin />;
  if (userError || queryError) return <Alert message="Error" type="error" />;

  const handleEdit = () => {
    // Handle for editing the user's name
    setIsEditing(true);
  };

  const onEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Handle for editing the user's name  and validation
    const newName = e.target.value;
    setName(newName);
    const errors = {
      empty: newName.trim() === "", // Check if the name is empty
      hasNumbers: /\d/.test(newName),
      tooLong: newName.length > 20,
    };

    setError(errors);
  };

  const handleUpdate = async () => {
    // Handle for updating the user's name
    const errors = {
      empty: name.trim() === "",
      hasNumbers: /\d/.test(name),
      tooLong: name.length > 20,
    };

    if (errors.empty || errors.hasNumbers || errors.tooLong) {
      // Check if the name is valid
      setError(errors);
      return;
    }

    try {
      const { data: updatedData } = await updateUserProfile({
        // Update the user profile
        variables: { input: { name: name } },
      });
      notification.success({
        message: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
      setError({ empty: false, hasNumbers: false, tooLong: false });
      // Update the local state with the new name
      setName(updatedData.updateUserProfile.name);
    } catch (error) {
      console.error("Error updating profile:", error);
      notification.error({
        message: "Error",
        description: "Failed to update profile",
      });
    }
  };

  const handleCancel = () => {
    // Handle for canceling the edit
    setIsEditing(false);
    setError({ empty: false, hasNumbers: false, tooLong: false });
  };

  return (
    <div>
      {isEditing ? ( // Render the edit form
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Input
              value={name}
              onChange={onEdit}
              style={{ maxWidth: 300 }}
              disabled={mutationLoading}
            />
            {error.empty && <Text type="danger">Name cannot be empty.</Text>}{" "}
            {/* Error message for empty name */}
            {error.hasNumbers && (
              <Text type="danger">Name cannot contain numbers.</Text> // Error message for name containing numbers
            )}
            {error.tooLong && (
              <Text type="danger">Name cannot exceed 20 characters.</Text> // Error message for name exceeding 20 characters
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <Button
              type="primary"
              onClick={handleUpdate}
              style={{ marginRight: 8 }}
              loading={mutationLoading}
              disabled={mutationLoading}
            >
              Update
            </Button>
            <Button
              onClick={handleCancel}
              style={{ color: "#8c8c8c" }}
              disabled={mutationLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        // Render the user's name
        <div>
          <Text>{data?.user?.name}</Text>
          <Text type="secondary"> ({data?.user?.role})</Text>
          <EditOutlined onClick={handleEdit} style={{ marginLeft: 8 }} />
        </div>
      )}
    </div>
  );
}
