import re

def extract_input_prompts(language: str, code: str) -> list[str]:
    """
    Scans source code for standard input statements and attempts to extract
    the prompt shown to the user (e.g. from a preceding print statement).
    """
    language = language.lower()
    prompts = []
    
    if language == "python":
        # Matches: input("Enter name: ")
        matches = re.finditer(r'input\(\s*(?:"([^"]*)"|\'([^\']*)\')?\s*\)', code)
        for i, match in enumerate(matches):
            label = match.group(1) or match.group(2)
            prompts.append(label if label is not None else f"Input {i+1}:")
            
    elif language in ["c", "c++", "cpp"]:
        # Matches: printf("Enter number: ");
        prints = [(m.end(), m.group(1)) for m in re.finditer(r'(?:printf|cout\s*<<)\s*\(?\s*"([^"]*)"', code)]
        # Matches: scanf("%d", &num); or cin >> num;
        inputs = [m.start() for m in re.finditer(r'(?:scanf|cin\s*>>)\s*\(?', code)]
        
        for i, inp_pos in enumerate(inputs):
            closest_print = None
            for p_pos, p_str in prints:
                if p_pos < inp_pos:
                    closest_print = p_str
            prompts.append(closest_print if closest_print else f"Input {i+1}:")
            
    elif language == "java":
        # Matches: System.out.print("Age: ");
        prints = [(m.end(), m.group(1)) for m in re.finditer(r'System\.out\.print(?:ln)?\s*\(\s*"([^"]*)"', code)]
        # Matches: scanner.nextInt()
        inputs = [m.start() for m in re.finditer(r'\.next(?:Int|Line|Double|Float|Long|Byte|Short|Boolean)?\s*\(', code)]
        
        for i, inp_pos in enumerate(inputs):
            closest_print = None
            for p_pos, p_str in prints:
                if p_pos < inp_pos:
                    closest_print = p_str
            prompts.append(closest_print if closest_print else f"Input {i+1}:")
            
    elif language in ["javascript", "javascript (react)", "typescript", "typescript (react)", "node.js"]:
        # Matches: console.log("Enter name:");
        prints = [(m.end(), m.group(1) or m.group(2)) for m in re.finditer(r'console\.log\s*\(\s*(?:"([^"]*)"|\'([^\']*)\')', code)]
        # Matches: prompt("Name?") or readline()
        inputs = [m for m in re.finditer(r'(?:prompt|readline|question)\s*\(\s*(?:"([^"]*)"|\'([^\']*)\')?\s*\)', code)]
        
        for i, match in enumerate(inputs):
            inp_pos = match.start()
            label = match.group(1) or match.group(2)
            if label:
                prompts.append(label)
                continue
                
            closest_print = None
            for p_pos, p_str in prints:
                if p_pos < inp_pos:
                    closest_print = p_str
            prompts.append(closest_print if closest_print else f"Input {i+1}:")
            
    return prompts
