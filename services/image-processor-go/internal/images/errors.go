package images

import "errors"

type Code string

const (
	CodeInvalidRequest Code = "INVALID_REQUEST"
	CodeSourceNotFound Code = "SOURCE_NOT_FOUND"
	CodeInvalidFormat  Code = "INVALID_FORMAT"
	CodeProcessFailed  Code = "PROCESS_FAILED"
	CodeSaveFailed     Code = "SAVE_FAILED"
	CodeInternal       Code = "INTERNAL"
)

type Error struct {
	Code    Code
	Message string
	Err     error
}

func (e *Error) Error() string {
	if e.Err == nil {
		return e.Message
	}
	return e.Message + ": " + e.Err.Error()
}

func (e *Error) Unwrap() error {
	return e.Err
}

func NewError(code Code, message string, err error) error {
	return &Error{
		Code:    code,
		Message: message,
		Err:     err,
	}
}

func CodeOf(err error) Code {
	var target *Error
	if errors.As(err, &target) {
		return target.Code
	}
	return CodeInternal
}
