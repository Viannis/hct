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

export async function updateUserRoleInAuth0({ // Service function to update the role of a user in Auth0
  role,
  accessToken,
  userId,
}: UpdateUserRoleParams): Promise<boolean> { // Promise to update the role of a user in Auth0
  try {
    console.log("Role name got in updateUserRoleInAuth0", role, userId); // Log the role and user ID  
    // Assign role to user
    await axios.post(
      `https://${AUTH0_DOMAIN}/api/v2/users/${userId}/roles`, // URL
      {
        roles: [role.id], // Roles to assign to the user
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Authorization
        },
      }
    );

    return true; // Return true
  } catch (error) {
    console.error("Error updating user role in Auth0:", error); // Log the error
    throw new Error("Failed to update user role in Auth0"); // Throw the error
  }
}
