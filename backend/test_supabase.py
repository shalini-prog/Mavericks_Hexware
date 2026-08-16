from database import supabase


print("Testing Supabase connection...")


response = (
    supabase
    .table("transactions")
    .select("*")
    .limit(1)
    .execute()
)


print("Supabase connection successful!")
print("Current transactions:")
print(response.data)