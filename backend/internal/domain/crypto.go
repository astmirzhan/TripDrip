package domain

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const promoAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

// HashPassword hashes a plaintext password with bcrypt.
func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("bcrypt hash: %w", err)
	}
	return string(b), nil
}

// CheckPassword compares a bcrypt hash with a plaintext password.
func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// HashDocNumber produces a deterministic SHA-256 hex digest of a document number.
func HashDocNumber(docType, number string) string {
	normalized := strings.ToUpper(strings.TrimSpace(docType)) + ":" + strings.ToUpper(strings.TrimSpace(number))
	sum := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(sum[:])
}

// GeneratePromoCode creates a collision-resistant human-readable promo code (e.g. TD-ABCD-EFGH-JKLM).
func GeneratePromoCode() (string, error) {
	const rawLen = 12
	buf := make([]byte, rawLen)
	max := big.NewInt(int64(len(promoAlphabet)))
	for i := 0; i < rawLen; i++ {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", fmt.Errorf("rand promo code: %w", err)
		}
		buf[i] = promoAlphabet[n.Int64()]
	}
	raw := string(buf)
	return fmt.Sprintf("TD-%s-%s-%s", raw[0:4], raw[4:8], raw[8:12]), nil
}
