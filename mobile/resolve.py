import os
import re

def resolve_file(filepath):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}, does not exist.")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to KEEP the "Stashed changes" and DISCARD the "Updated upstream"
    # Format is:
    # <<<<<<< Updated upstream
    # old code
    # =======
    # new code
    # >>>>>>> Stashed changes
    
    # Regex to match the conflict blocks
    pattern = re.compile(r'<<<<<<< Updated upstream\n.*?\n=======\n(.*?)\n>>>>>>> Stashed changes\n?', re.DOTALL)
    
    resolved_content = pattern.sub(r'\1\n', content)
    
    # Check if there are still any markers
    if '<<<<<<<' in resolved_content:
        print(f"Warning: unresolved markers found in {filepath}!")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(resolved_content)
    
    print(f"Resolved conflicts in {filepath}")

if __name__ == "__main__":
    resolve_file("screens/ProviderResultsScreen.js")
    resolve_file("screens/AgentThinkingScreen.js")
