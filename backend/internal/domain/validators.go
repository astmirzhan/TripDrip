package domain

import (
	"net/mail"
	"regexp"
	"strings"
	"unicode"
)

var (
	phoneRegex       = regexp.MustCompile(`^\+?[0-9]{7,15}$`)
	countryCodeRegex = regexp.MustCompile(`^[A-Z]{2}$`)
	digits12Regex    = regexp.MustCompile(`^[0-9]{12}$`)
)

// ValidateEmail checks basic RFC 5322 email syntax.
func ValidateEmail(email string) bool {
	email = strings.TrimSpace(email)
	if len(email) < 5 || len(email) > 255 {
		return false
	}
	_, err := mail.ParseAddress(email)
	return err == nil && strings.Contains(email, ".")
}

// ValidatePhone checks E.164-like numeric phone string.
func ValidatePhone(phone string) bool {
	phone = strings.TrimSpace(phone)
	return phoneRegex.MatchString(phone)
}

// ValidateCountryCode checks ISO 3166-1 alpha-2 format.
func ValidateCountryCode(code string) bool {
	return countryCodeRegex.MatchString(strings.ToUpper(strings.TrimSpace(code)))
}

// ValidatePassword checks minimum strength (8+ chars, at least 1 letter & 1 digit).
func ValidatePassword(pw string) bool {
	if len(pw) < 8 || len(pw) > 128 {
		return false
	}
	var hasLetter, hasDigit bool
	for _, r := range pw {
		if unicode.IsLetter(r) {
			hasLetter = true
		} else if unicode.IsDigit(r) {
			hasDigit = true
		}
	}
	return hasLetter && hasDigit
}

// ValidateKZNumber12 validates Kazakhstan IIN or BIN 12-digit checksum.
func ValidateKZNumber12(num string) bool {
	num = strings.TrimSpace(num)
	if !digits12Regex.MatchString(num) {
		return false
	}

	digits := make([]int, 12)
	for i := 0; i < 12; i++ {
		digits[i] = int(num[i] - '0')
	}

	w1 := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}
	w2 := []int{3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2}

	sum := 0
	for i := 0; i < 11; i++ {
		sum += digits[i] * w1[i]
	}
	ctrl := sum % 11
	if ctrl == 10 {
		sum = 0
		for i := 0; i < 11; i++ {
			sum += digits[i] * w2[i]
		}
		ctrl = sum % 11
	}

	return ctrl < 10 && ctrl == digits[11]
}
