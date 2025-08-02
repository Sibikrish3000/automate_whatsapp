import subprocess
import sys
def get_indian_numbers():
    """
    Prompts the user to enter a specified number of Indian mobile numbers and validates the input.
    """
    indian_numbers = []
    n_numbers = input("Enter the number of Indian mobile numbers to add: ").strip()
    print(f"Please enter {n_numbers} Indian mobile numbers (10 digits each).")

    while len(indian_numbers) < int(n_numbers):
        try:
            number_input = input(f"Enter number {len(indian_numbers) + 1}: ").strip()
            
            # Basic validation for 10 digits
            if number_input.isdigit() and len(number_input) == 10:
                indian_numbers.append(number_input)
            else:
                print("Invalid input. Please enter a 10-digit mobile number.")
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
            return []
            
    return indian_numbers

if __name__ == '__main__':
    numbers = get_indian_numbers()
    if numbers:
        print("\n--- Collected Numbers ---")
        for number in numbers:
            print(number)
            
        formatted_numbers = [f"91{num}@c.us" for num in numbers]
        
        print("\nAttempting to add numbers to WhatsApp group...")
        try:
            # Construct the command to execute the Node.js script with the numbers as arguments
            command = ['node', 'add_members.js'] + formatted_numbers
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            print("Script output:", result.stdout)
        except FileNotFoundError:
            print("Error: 'node' command not found. Please ensure Node.js is installed.")
        except subprocess.CalledProcessError as e:
            print("Error executing Node.js script:")
            print(e.stderr)