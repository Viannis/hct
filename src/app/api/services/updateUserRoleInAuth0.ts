import axios from "axios";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;

type UserRole = {
    id: string;
    name: string;
    description?: string;
  };

interface UpdateUserRoleParams {
  role: UserRole;
  accessToken: string;
  userId: string;
}

export async function updateUserRoleInAuth0({
  role,
  accessToken,
  userId,
}: UpdateUserRoleParams): Promise<boolean> {
  try {
    console.log("Role name got in updateUserRoleInAuth0", role, userId);
    // Assign role to user
    await axios.post(
      `https://${AUTH0_DOMAIN}/api/v2/users/${userId}/roles`,
      {
        roles: [role],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return true;
  } catch (error) {
    console.error("Error updating user role in Auth0:", error);
    throw new Error("Failed to update user role in Auth0");
  }
}
