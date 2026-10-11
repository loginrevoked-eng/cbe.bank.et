class Utils:
    @staticmethod
    def numtoword(num:float|int) -> str:
        try:
            num = float(num)
            birr = int(num)
            cents = int((num - birr) * 100)
            ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
            teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
            tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
            if birr == 0:
                return "Zero & Zero cents"
            result = []
            if birr >= 1000:
                thousands = birr // 1000
                if thousands < 10:
                    result.append(ones[thousands])
                elif thousands < 20:
                    result.append(teens[thousands - 10])
                else:
                    result.append(tens[thousands // 10])
                    if thousands % 10:
                        result.append(ones[thousands % 10])
                result.append("Thousand")
                birr = birr % 1000
            if birr >= 100:
                result.append(ones[birr // 100])
                result.append("Hundred")
                birr = birr % 100
            if birr >= 20:
                result.append(tens[birr // 10])
                if birr % 10:
                    result.append(ones[birr % 10])
            elif birr >= 10:
                result.append(teens[birr - 10])
            elif birr > 0:
                result.append(ones[birr])
            words = " ".join(result)
            return f"{words} & {cents if cents > 0 else 'Zero'} cents"
        except:
            return "N/A"
    
    @staticmethod
    def mask_account(account):
        if "*" in account:
            return account
        account = "10*****" + "".join(account[-4:])



